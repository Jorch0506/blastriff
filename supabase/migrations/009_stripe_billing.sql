-- Blast Riff — Stripe billing: subscriptions ledger, event idempotency,
-- and a derived is_premium/premium_expires_at that combines two independent
-- sources (referral rewards and Stripe subscriptions) without either one
-- clobbering the other.
--
-- Design summary (see conversation for full rationale):
--   * profiles.is_premium / profiles.premium_expires_at become DERIVED
--     columns. Nothing writes them directly anymore — only
--     recompute_profile_premium() may.
--   * profiles.referral_premium_expires_at is the new SOURCE column for
--     referral-granted premium (previously referral/complete/route.ts wrote
--     straight to premium_expires_at/is_premium; that call site must be
--     updated separately to write referral_premium_expires_at instead).
--   * subscriptions is the SOURCE for Stripe-granted premium.
--   * Two triggers call recompute_profile_premium() whenever a SOURCE
--     column changes. Neither trigger can re-fire itself, because
--     recompute_profile_premium() never writes to the columns that arm the
--     triggers (see comments below at each trigger).
--   * The Stripe grace period (3 calendar days from invoice.payment_failed)
--     is a time-based boundary, not an event-based one — nothing in Stripe
--     necessarily calls our webhook again exactly when it expires. A
--     pg_cron sweep (run_grace_period_sweep) re-evaluates it hourly so
--     access is revoked (and the user notified) even if Stripe stays
--     silent during the grace window.

-- =========================================================
-- 1) Tabla ledger de Stripe
-- =========================================================
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  lookup_key text not null check (lookup_key in ('trve_pass_monthly', 'trve_pass_annual')),
  status text not null check (status in (
    'active', 'trialing', 'past_due', 'canceled',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused'
  )),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  -- Ventana de gracia por fallo de pago (independiente de current_period_end,
  -- que para una suscripcion en past_due ya quedo en el pasado).
  payment_failed_at timestamptz,
  -- Marca que el sweep periodico ya proceso el vencimiento de este ciclo de
  -- gracia (recalculo + notificacion si aplica), para no repetirlo en cada
  -- corrida del cron.
  grace_period_processed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions (user_id);
create index if not exists idx_subscriptions_stripe_customer_id on subscriptions (stripe_customer_id);
create index if not exists idx_subscriptions_grace_pending
  on subscriptions (payment_failed_at)
  where payment_failed_at is not null and grace_period_processed_at is null;

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- =========================================================
-- 2) Idempotencia de eventos Stripe
-- =========================================================
create table if not exists stripe_events (
  id text primary key,   -- event.id de Stripe (evt_...), usado tal cual como PK para deduplicar reintentos
  type text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3) Columna fuente para premium por referidos
-- =========================================================
alter table profiles add column if not exists referral_premium_expires_at timestamptz;

-- Backfill: hoy premium_expires_at solo refleja el flujo de referidos.
-- Se ejecuta ANTES de crear el trigger de la seccion 5, asi que no dispara nada.
update profiles set referral_premium_expires_at = premium_expires_at;

-- =========================================================
-- 4) Funcion derivadora: unica que puede escribir is_premium / premium_expires_at
-- =========================================================
create or replace function recompute_profile_premium(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral timestamptz;
  v_stripe timestamptz;
  v_combined timestamptz;
begin
  select referral_premium_expires_at into v_referral
  from profiles where id = p_user_id;

  select max(
    case
      when status in ('active', 'trialing') then current_period_end
      when status = 'past_due' and payment_failed_at is not null
        then payment_failed_at + interval '3 days'
      else null
    end
  ) into v_stripe
  from subscriptions
  where user_id = p_user_id;

  v_combined := greatest(coalesce(v_referral, '-infinity'::timestamptz), coalesce(v_stripe, '-infinity'::timestamptz));
  if v_combined = '-infinity'::timestamptz then
    v_combined := null;
  end if;

  update profiles
  set premium_expires_at = v_combined,
      is_premium = (v_combined is not null and v_combined > now())
  where id = p_user_id;
  -- IMPORTANTE: este UPDATE nunca incluye referral_premium_expires_at en su
  -- SET, por lo que no puede re-disparar trg_profiles_referral_premium
  -- (ver seccion 5): en Postgres, un trigger "UPDATE OF <col>" solo se
  -- activa cuando esa columna aparece en el SET de la sentencia.
end;
$$;

-- =========================================================
-- 5) Triggers: solo se disparan por cambios en columnas FUENTE
-- =========================================================
create or replace function trg_recompute_premium_from_profiles()
returns trigger language plpgsql as $$
begin
  perform recompute_profile_premium(new.id);
  return new;
end;
$$;

create trigger trg_profiles_referral_premium
  after update of referral_premium_expires_at on profiles
  for each row execute function trg_recompute_premium_from_profiles();

create or replace function trg_recompute_premium_from_subscriptions()
returns trigger language plpgsql as $$
begin
  perform recompute_profile_premium(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_subscriptions_premium
  after insert or update or delete on subscriptions
  for each row execute function trg_recompute_premium_from_subscriptions();

-- =========================================================
-- 6) Sweep periodico: cubre el vencimiento por PASO DEL TIEMPO (sin evento
--    nuevo de Stripe), y notifica la perdida de acceso exactamente una vez
--    por ciclo de gracia.
-- =========================================================
create or replace function run_grace_period_sweep()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_is_premium boolean;
begin
  for rec in
    select id, user_id
    from subscriptions
    where payment_failed_at is not null
      and status = 'past_due'
      and payment_failed_at + interval '3 days' <= now()
      and grace_period_processed_at is null
  loop
    perform recompute_profile_premium(rec.user_id);

    select is_premium into v_is_premium from profiles where id = rec.user_id;

    -- Solo notifica perdida de acceso si el recalculo efectivamente lo dejo
    -- sin premium (si referral_premium_expires_at todavia lo cubre, no
    -- perdio nada y no corresponde notificar).
    if not v_is_premium then
      insert into notifications (user_id, type, title, body)
      values (
        rec.user_id,
        'premium_access_lost',
        'Perdiste tu TRVE PASS',
        'Tu pago no pudo procesarse y el periodo de gracia de 3 dias termino. Reactiva tu suscripcion para recuperar el acceso.'
      );
    end if;

    update subscriptions set grace_period_processed_at = now() where id = rec.id;
  end loop;
end;
$$;

-- =========================================================
-- 7) Programacion del sweep con pg_cron (cada hora, en el minuto 0).
--    cron.schedule() actualiza el job existente si 'grace-period-sweep' ya
--    existe, asi que re-ejecutar esta migracion es seguro (idempotente).
-- =========================================================
create extension if not exists pg_cron;

select cron.schedule(
  'grace-period-sweep',
  '0 * * * *',
  $$select run_grace_period_sweep();$$
);

-- =========================================================
-- 8) RLS
-- =========================================================
alter table subscriptions enable row level security;
alter table stripe_events enable row level security;

create policy "Users can view their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);
-- Sin policies de insert/update/delete para authenticated/anon: solo el
-- webhook y el sweep (ambos via service_role o funciones SECURITY DEFINER)
-- escriben. stripe_events no expone lectura a clientes.
