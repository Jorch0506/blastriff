import Link from "next/link";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

const MILESTONES = [
  { days: 100, badge: "🥇" },
  { days: 30, badge: "🥈" },
  { days: 7, badge: "🥉" },
];

function getMilestoneBadge(streak: number): string | null {
  const milestone = MILESTONES.find((entry) => streak >= entry.days);
  return milestone?.badge ?? null;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const badge = getMilestoneBadge(currentStreak);
  const onFire = currentStreak >= 7;

  return (
    <section
      className={`rounded-xl border p-5 ${
        onFire ? "animate-pulse-gold border-gold bg-surface" : "border-border bg-surface"
      }`}
    >
      {currentStreak === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-metal text-lg text-text-muted">START YOUR STREAK TODAY</p>
          <Link
            href="/play"
            className="shrink-0 rounded-lg bg-primary px-4 py-2 font-metal text-sm text-text transition-colors hover:bg-primary-hover"
          >
            PLAY NOW
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`font-metal text-lg ${onFire ? "text-gold" : "text-primary"}`}>
              {onFire ? "⚡" : "🔥"} {currentStreak} DAY STREAK
              {onFire ? " — ON FIRE!" : ""}
            </p>
            <p className="mt-1 text-xs text-text-muted">Longest streak: {longestStreak} days</p>
          </div>
          {badge && <span className="text-2xl">{badge}</span>}
        </div>
      )}
    </section>
  );
}
