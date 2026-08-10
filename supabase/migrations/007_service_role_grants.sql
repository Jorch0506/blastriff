-- Blast Riff — service_role table grants
--
-- Root cause of "Challenge not found" on /c/[token] (and other admin-client
-- reads/writes): the service_role key bypasses RLS, but it still needs
-- table-level GRANTs like any other Postgres role. 004_grants.sql gave
-- `anon`/`authenticated` their grants but never granted `service_role`
-- anything, because this project's tables were provisioned via direct SQL
-- migrations rather than the Supabase dashboard bootstrap (which normally
-- grants service_role implicitly). Every createAdminClient() call — the
-- public challenge GET/submit routes, game completion notifications,
-- referral rewards — was hitting Postgres error 42501 ("permission denied
-- for table X"), which each route's error handling quietly turned into a
-- generic "not found" / failed response. This is not an RLS problem:
-- service_role already bypasses RLS by design, so no RLS policy change is
-- needed or wanted here (see note below on why we're not adding an anon
-- SELECT policy on `challenges`).

grant usage on schema public to service_role;

grant select, insert, update, delete on
  profiles,
  questions,
  game_sessions,
  challenges,
  achievements,
  tournaments,
  tournament_entries,
  notifications,
  referrals
to service_role;

-- Note on `challenges` public access: we deliberately do NOT add an anon/
-- authenticated RLS SELECT policy on `challenges`. The `questions_data`
-- column embeds each question's `correct_option`, and RLS can only hide or
-- show a whole row — it can't redact individual columns. A public SELECT
-- policy would let anyone with the anon key read a challenge's answers
-- directly via PostgREST (GET /rest/v1/challenges?share_token=eq.X) before
-- playing it. Public access to challenges already goes through
-- GET /api/challenges/[token], which uses service_role (now correctly
-- granted above) and strips correct_option via toPublicQuestions() before
-- ever sending questions to an unauthenticated guest. That's the safe
-- chokepoint — keep it as the only public read path for this table.
