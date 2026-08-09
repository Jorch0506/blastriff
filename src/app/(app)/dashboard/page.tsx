import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_THRESHOLDS, getLevelName, getNextLevelThreshold } from "@/lib/game/levels";
import { StreakCard } from "@/components/dashboard/StreakCard";

const GENRES = [
  { id: "thrash", label: "Thrash Metal", emoji: "⚡" },
  { id: "death", label: "Death Metal", emoji: "💀" },
  { id: "black", label: "Black Metal", emoji: "🐺" },
  { id: "doom", label: "Doom Metal", emoji: "⛓️" },
  { id: "power", label: "Power Metal", emoji: "🔥" },
  { id: "all", label: "All Metal", emoji: "🤘" },
];

export default async function DashboardPage() {
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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <section className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-metal text-2xl text-text">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="font-metal text-xl text-text">{profile.username}</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            LEVEL {level} · {levelName}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {profile.trve_points.toLocaleString()} TP
            {nextThreshold ? ` · ${nextThreshold.toLocaleString()} TP to next level` : " · MAX LEVEL"}
          </p>
        </div>
      </section>

      <StreakCard currentStreak={profile.current_streak} longestStreak={profile.longest_streak} />

      <section>
        <h2 className="mb-3 font-metal text-lg text-text">QUICK PLAY</h2>
        <div className="grid grid-cols-3 gap-3">
          {GENRES.map((genre) => (
            <Link
              key={genre.id}
              href={`/play?genre=${genre.id}`}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
            >
              <span className="text-2xl">{genre.emoji}</span>
              <span className="text-center text-xs font-semibold text-text">{genre.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="font-metal text-xl text-gold">{profile.total_questions_answered}</p>
          <p className="text-xs text-text-muted">Questions</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="font-metal text-xl text-gold">{correctRate}%</p>
          <p className="text-xs text-text-muted">Correct rate</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="font-metal text-xl text-gold">{profile.longest_streak}</p>
          <p className="text-xs text-text-muted">Best streak</p>
        </div>
      </section>
    </main>
  );
}
