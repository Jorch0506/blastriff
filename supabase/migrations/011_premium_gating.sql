-- Blast Riff — TRVE PASS premium gating support
--
-- 1) profiles.profile_theme: premium-only accent color selection. Defaults
--    to null (classic red/gold look). Application code must also re-check
--    is_premium before honoring a non-null value (a lapsed subscriber keeps
--    the column value but loses the visual perk until they resubscribe).
alter table profiles add column if not exists profile_theme text
  check (profile_theme is null or profile_theme in ('frost', 'venom', 'ash'));

-- 2) leaderboard_view: expose is_premium so the client can render the
--    TRVE KVLT badge without a second round-trip per row.
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
  rank() over (order by p.trve_points desc) as rank,
  p.is_premium
from public.profiles p
where p.trve_points > 0
order by p.trve_points desc;

grant select on public.leaderboard_view to authenticated, anon;
