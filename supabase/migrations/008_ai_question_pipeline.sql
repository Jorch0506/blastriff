-- Blast Riff — AI question generation pipeline (multi-locale architecture, en/es content for now)
--
-- Naming note: `questions.language` already existed (migration 001) and is
-- already indexed as part of idx_questions_genre_difficulty_language and
-- already read/written by /api/questions and the seed data. Rather than add
-- a redundant `locale` column with the same meaning, we lock the existing
-- column down to the two locales we generate content for. `profiles` has no
-- equivalent column yet, so `preferred_locale` is added fresh there.

-- =========================================================================
-- Lock `questions.language` to the locales we generate content for
-- =========================================================================

alter table questions
  add constraint questions_language_check check (language in ('en', 'es'));

-- idx_questions_genre_difficulty_language (genre, difficulty, language) from
-- 001_initial_schema.sql already covers the challenge-matching query shape
-- (genre + difficulty + language) used below and in /api/questions — no new
-- index needed.

-- =========================================================================
-- profiles.preferred_locale — read by challenge matching, no UI yet
-- =========================================================================

alter table profiles
  add column preferred_locale text not null default 'en'
    check (preferred_locale in ('en', 'es'));

-- =========================================================================
-- questions_pending_review — staging table for AI-generated questions
-- =========================================================================
-- Generated questions never insert directly into `questions`. They land
-- here as 'pending' (only once an independent fact-check call has confirmed
-- the marked answer) or 'needs_review' (fact-check disagreed or was
-- uncertain), and only move to `questions` when an admin approves them via
-- the /admin/questions panel.

create table if not exists questions_pending_review (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  explanation text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  genre text not null,
  question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'audio', 'image')),
  tags text[] not null default '{}',
  language text not null default 'en' check (language in ('en', 'es')),
  related_band text,
  related_album text,
  related_song text,
  related_year integer,
  ai_generated boolean not null default true,
  generation_model text not null,
  generation_batch_id uuid not null,
  fact_check_model text,
  fact_check_verdict text check (fact_check_verdict in ('VERIFIED_CORRECT', 'VERIFIED_INCORRECT', 'UNCERTAIN')),
  fact_check_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'needs_review', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_pending_review_grouping
  on questions_pending_review (genre, difficulty, language, status);

alter table questions_pending_review enable row level security;

create policy "admins and moderators can read pending questions"
  on questions_pending_review for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "admins and moderators can update pending questions"
  on questions_pending_review for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

-- =========================================================================
-- service_role grants (see 007_service_role_grants.sql for why this is
-- needed even though service_role bypasses RLS)
-- =========================================================================

grant select, insert, update, delete on questions_pending_review to service_role;

-- =========================================================================
-- Bootstrap the first admin so /admin/questions is reachable at all
-- =========================================================================
-- No-op (0 rows updated) if this email hasn't signed up yet — safe to
-- re-run this migration's statement manually after the account exists.

update profiles
set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('jorge.mejiao@gmail.com'));
