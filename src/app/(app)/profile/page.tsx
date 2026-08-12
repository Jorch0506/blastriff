import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_THRESHOLDS, getLevelName, getNextLevelThreshold } from "@/lib/game/levels";
import { flagEmoji, ONBOARDING_GENRES } from "@/lib/onboarding";
import { getJoinUrl } from "@/lib/referral";
import { InviteSection } from "@/components/profile/InviteSection";
import { ThemeSelector } from "@/components/profile/ThemeSelector";
import { SignOutButton } from "@/components/profile/SignOutButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  const FREE_HISTORY_LIMIT = 10;

  let sessionsQuery = supabase
    .from("game_sessions")
    .select("id, mode, genre, score, trve_points_earned, correct_answers, total_questions, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (!profile.is_premium) {
    sessionsQuery = sessionsQuery.limit(FREE_HISTORY_LIMIT);
  }

  const { data: sessions } = await sessionsQuery;
  const mayHaveMoreHistory = !profile.is_premium && (sessions?.length ?? 0) >= FREE_HISTORY_LIMIT;

  const { data: rankEntry } = await supabase
    .from("leaderboard_view")
    .select("rank")
    .eq("id", user.id)
    .maybeSingle();

  const { count: referralCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id);

  const level = profile.level;
  const levelName = getLevelName(level);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = getNextLevelThreshold(level);
  const progress = nextThreshold
    ? Math.min(
        100,
        Math.round(((profile.trve_points - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      )
    : 100;

  const correctRate =
    profile.total_questions_answered > 0
      ? Math.round((profile.total_correct / profile.total_questions_answered) * 100)
      : 0;

  const genreLabels = new Map(ONBOARDING_GENRES.map((genre) => [genre.id, genre]));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <section className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated text-4xl">
          {profile.avatar_url || profile.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="flex items-center justify-center gap-2 font-metal text-2xl text-text">
            {profile.country_code && <span>{flagEmoji(profile.country_code)}</span>}
            {profile.username}
            {profile.is_premium && (
              <span
                title="TRVE KVLT"
                className="inline-flex items-center rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold"
              >
                🔥 TRVE KVLT
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold">
            LEVEL {level} · {levelName}
          </p>
        </div>
        <p className="font-metal text-3xl text-gold">{profile.trve_points.toLocaleString()} TP</p>

        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {nextThreshold
              ? `${(nextThreshold - profile.trve_points).toLocaleString()} TP to next level`
              : "MAX LEVEL"}
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-lg border border-border px-6 py-2 text-sm font-semibold text-text-muted opacity-60"
        >
          EDIT PROFILE
        </button>

        <Link href="/leaderboard" className="text-sm font-semibold text-primary hover:underline">
          {rankEntry ? `YOU'RE #${rankEntry.rank} WORLDWIDE` : "Not ranked yet — play to climb the ranks"}
        </Link>

        <SignOutButton />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-metal text-xl text-gold">{profile.total_questions_answered}</p>
          <p className="text-xs text-text-muted">Questions</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-metal text-xl text-gold">{correctRate}%</p>
          <p className="text-xs text-text-muted">Correct rate</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-metal text-xl text-gold">{profile.longest_streak}</p>
          <p className="text-xs text-text-muted">Best streak</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-metal text-xl text-gold">{profile.current_streak}</p>
          <p className="text-xs text-text-muted">Current streak</p>
        </div>
      </section>

      {profile.preferred_genres.length > 0 && (
        <section>
          <h2 className="mb-3 font-metal text-lg text-text">FAVORITE GENRES</h2>
          <div className="flex flex-wrap gap-2">
            {profile.preferred_genres.map((genreId) => {
              const genre = genreLabels.get(genreId);
              return (
                <span
                  key={genreId}
                  className="rounded-full border border-gold px-3 py-1 text-xs font-semibold text-gold"
                >
                  {genre ? `${genre.emoji} ${genre.label}` : genreId}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <ThemeSelector currentTheme={profile.profile_theme} isPremium={profile.is_premium} />

      <InviteSection joinUrl={getJoinUrl(profile.username)} referralCount={referralCount ?? 0} />

      <section>
        <h2 className="mb-3 font-metal text-lg text-text">RECENT SESSIONS</h2>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-semibold capitalize text-text">{session.genre ?? "mixed"}</p>
                  <p className="text-xs text-text-muted">{formatDate(session.completed_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">
                    {session.correct_answers}/{session.total_questions}
                  </p>
                  <p className="text-xs text-gold">+{session.trve_points_earned.toLocaleString()} TP</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
            No sessions yet. <Link href="/play" className="text-primary hover:underline">Play now</Link>
          </div>
        )}
        {mayHaveMoreHistory && (
          <p className="mt-3 text-center text-xs text-text-muted">
            Free members see your last {FREE_HISTORY_LIMIT} sessions.{" "}
            <a href="/api/billing/checkout" className="text-gold hover:underline">
              Get TRVE PASS
            </a>{" "}
            for full history.
          </p>
        )}
      </section>
    </main>
  );
}
