-- Blast Riff — row level security policies

alter table profiles enable row level security;
alter table questions enable row level security;
alter table game_sessions enable row level security;
alter table challenges enable row level security;
alter table achievements enable row level security;
alter table tournaments enable row level security;
alter table tournament_entries enable row level security;

-- =========================================================================
-- profiles: public read, owner write
-- =========================================================================

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- =========================================================================
-- questions: public read of verified questions, admin/moderator write
-- =========================================================================

create policy "verified questions are publicly readable"
  on questions for select
  using (verified = true);

create policy "admins and moderators can insert questions"
  on questions for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "admins and moderators can update questions"
  on questions for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "admins and moderators can delete questions"
  on questions for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

-- =========================================================================
-- game_sessions: owner only
-- =========================================================================

create policy "users can read their own game sessions"
  on game_sessions for select
  using (auth.uid() = user_id);

create policy "users can insert their own game sessions"
  on game_sessions for insert
  with check (auth.uid() = user_id);

create policy "users can update their own game sessions"
  on game_sessions for update
  using (auth.uid() = user_id);

-- =========================================================================
-- challenges: participants only
-- =========================================================================

create policy "participants can read their challenges"
  on challenges for select
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "challengers can create challenges"
  on challenges for insert
  with check (auth.uid() = challenger_id);

create policy "participants can update their challenges"
  on challenges for update
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

-- =========================================================================
-- achievements: public read, owner insert
-- =========================================================================

create policy "achievements are publicly readable"
  on achievements for select
  using (true);

create policy "users can insert their own achievements"
  on achievements for insert
  with check (auth.uid() = user_id);

-- =========================================================================
-- tournaments: public read
-- =========================================================================

create policy "tournaments are publicly readable"
  on tournaments for select
  using (true);

-- =========================================================================
-- tournament_entries: owner only
-- =========================================================================

create policy "users can read their own tournament entries"
  on tournament_entries for select
  using (auth.uid() = user_id);

create policy "users can insert their own tournament entries"
  on tournament_entries for insert
  with check (auth.uid() = user_id);

create policy "users can update their own tournament entries"
  on tournament_entries for update
  using (auth.uid() = user_id);
