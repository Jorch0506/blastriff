-- Blast Riff — Session 4: notifications + referrals

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
on public.notifications(user_id, read_at)
where read_at is null;

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

grant select, insert, update on public.notifications to authenticated;

-- =========================================================================
-- Referrals
-- =========================================================================

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade not null,
  reward_given boolean not null default false,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

alter table public.referrals enable row level security;

create policy "Users can read own referrals" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

grant select, insert on public.referrals to authenticated;
