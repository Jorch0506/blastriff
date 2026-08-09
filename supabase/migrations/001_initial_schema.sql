-- Blast Riff — initial schema
create extension if not exists "pgcrypto";

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  country_code text,
  preferred_genres text[] not null default '{}',
  trve_points integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_at timestamptz,
  total_questions_answered integer not null default 0,
  total_correct integer not null default 0,
  is_premium boolean not null default false,
  premium_expires_at timestamptz,
  stripe_customer_id text,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questions (
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
  language text not null default 'en',
  related_band text,
  related_album text,
  related_song text,
  related_year integer,
  youtube_url text,
  spotify_url text,
  apple_music_url text,
  source_url text,
  verified boolean not null default false,
  ai_generated boolean not null default false,
  confidence_score numeric,
  play_count integer not null default 0,
  correct_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('solo', 'challenge', 'tournament', 'daily')),
  genre text,
  questions_data jsonb not null default '[]',
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  score integer not null default 0,
  trve_points_earned integer not null default 0,
  max_streak integer not null default 0,
  duration_seconds integer not null default 0,
  completed_at timestamptz
);

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references profiles(id) on delete cascade,
  challenged_id uuid references profiles(id) on delete cascade,
  genre text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  questions_data jsonb not null default '[]',
  challenger_score integer,
  challenger_correct integer,
  challenger_time_seconds integer,
  challenger_completed_at timestamptz,
  challenged_score integer,
  challenged_correct integer,
  challenged_time_seconds integer,
  challenged_completed_at timestamptz,
  points_at_stake integer not null default 0,
  winner_id uuid references profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'expired', 'declined')),
  share_token text not null unique default encode(gen_random_bytes(6), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_key text not null,
  achievement_data jsonb not null default '{}',
  trve_points_reward integer not null default 0,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  genre text,
  entry_fee_cents integer not null default 0,
  prize_pool_cents integer not null default 0,
  max_participants integer not null default 100,
  current_participants integer not null default 0,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

-- =========================================================================
-- Indexes
-- =========================================================================

create index if not exists idx_questions_genre_difficulty_language
  on questions (genre, difficulty, language);

create index if not exists idx_profiles_trve_points
  on profiles (trve_points desc);

create index if not exists idx_profiles_country_trve_points
  on profiles (country_code, trve_points desc);

create index if not exists idx_challenges_share_token
  on challenges (share_token);

create index if not exists idx_game_sessions_user_completed
  on game_sessions (user_id, completed_at desc);

-- =========================================================================
-- updated_at triggers
-- =========================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

drop trigger if exists trg_questions_updated_at on questions;
create trigger trg_questions_updated_at
  before update on questions
  for each row
  execute function set_updated_at();

-- =========================================================================
-- Auto-create profile on signup
-- =========================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'metalhead_' || substr(new.id::text, 1, 8));
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- =========================================================================
-- Level helpers
-- =========================================================================

create or replace function get_level_from_points(points integer)
returns integer
language plpgsql
immutable
as $$
begin
  if points >= 25000 then return 6;
  elsif points >= 10000 then return 5;
  elsif points >= 5000 then return 4;
  elsif points >= 2000 then return 3;
  elsif points >= 500 then return 2;
  else return 1;
  end if;
end;
$$;

create or replace function get_level_name(level integer)
returns text
language plpgsql
immutable
as $$
begin
  case level
    when 1 then return 'POSEUR';
    when 2 then return 'HEADBANGER';
    when 3 then return 'METALHEAD';
    when 4 then return 'CULT MEMBER';
    when 5 then return 'TRVE KVLT';
    when 6 then return 'BLAST RIFF';
    else return 'POSEUR';
  end case;
end;
$$;
