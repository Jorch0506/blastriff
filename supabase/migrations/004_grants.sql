-- Blast Riff — baseline table grants
--
-- RLS policies (002_rls_policies.sql) control row-level access, but Postgres
-- also requires table-level GRANTs before RLS is ever evaluated. Projects
-- provisioned outside the Supabase dashboard's default bootstrap (e.g. via
-- direct SQL migrations) don't get these automatically, which surfaces as
-- "permission denied for table X" (42501) even though the RLS policy would
-- have allowed the row.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  profiles,
  questions,
  game_sessions,
  challenges,
  achievements,
  tournaments,
  tournament_entries
to authenticated;

grant select on
  profiles,
  questions,
  achievements,
  tournaments
to anon;
