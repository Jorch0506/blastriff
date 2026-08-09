-- Session 3 — gamification support: achievement lookups + global leaderboard view

create index if not exists idx_achievements_user_key on public.achievements(user_id, achievement_key);

create or replace view public.leaderboard_view as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.country_code,
  p.trve_points,
  p.level,
  p.current_streak,
  rank() over (order by p.trve_points desc) as rank
from public.profiles p
where p.trve_points > 0
order by p.trve_points desc;

grant select on public.leaderboard_view to authenticated, anon;
