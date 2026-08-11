-- Blast Riff — service_role grants for Stripe billing tables/functions
--
-- Same root cause as 007_service_role_grants.sql: service_role bypasses RLS
-- but still needs table-level GRANTs. The webhook route
-- (src/app/api/webhooks/stripe) uses createAdminClient(), and the pg_cron
-- sweep function runs SECURITY DEFINER, but recompute_profile_premium()
-- also needs to be callable directly via PostgREST RPC if the app ever
-- needs to trigger a recompute outside of a trigger context.

grant select, insert, update, delete on
  subscriptions,
  stripe_events
to service_role;

grant select on subscriptions to authenticated;

grant execute on function recompute_profile_premium(uuid) to service_role;
grant execute on function run_grace_period_sweep() to service_role;
