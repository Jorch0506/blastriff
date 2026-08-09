"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { flagEmoji } from "@/lib/onboarding";
import { getLevelName } from "@/lib/game/levels";
import type { LeaderboardEntry } from "@/types/database";

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
};

function AvatarBadge({ entry, size = "text-xl" }: { entry: LeaderboardEntry; size?: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated ${size}`}>
      {entry.avatar_url || entry.username.charAt(0).toUpperCase()}
    </div>
  );
}

function PodiumSpot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const heights = { 1: "h-40", 2: "h-32", 3: "h-24" };
  const bg = {
    1: "border-gold bg-gold/10",
    2: "border-text-muted bg-surface-elevated",
    3: "border-[#B87333] bg-[#B87333]/10",
  };
  const order = { 1: "order-2", 2: "order-1", 3: "order-3" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.15, duration: 0.4 }}
      className={`flex flex-1 flex-col items-center gap-2 ${order[place]}`}
    >
      {place === 1 && <span className="text-2xl">👑</span>}
      <AvatarBadge entry={entry} size="text-2xl" />
      <p className="max-w-[90px] truncate font-metal text-sm text-text">{entry.username}</p>
      <p className="text-xs text-gold">{entry.trve_points.toLocaleString()} TP</p>
      <div className={`flex w-full items-end justify-center rounded-t-lg border ${heights[place]} ${bg[place]}`}>
        <span className="mb-2 font-metal text-2xl text-text">{place}</span>
      </div>
    </motion.div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const response = await fetch("/api/leaderboard?type=global&limit=50");
    if (response.ok) {
      const json = (await response.json()) as LeaderboardResponse;
      setData(json);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const currentUser = data?.currentUser ?? null;
  const currentUserInTop50 = currentUser ? entries.some((entry) => entry.id === currentUser.id) : true;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 pb-24">
      <div className="text-center">
        <h1 className="font-metal text-2xl text-text">THE PIT RANKINGS</h1>
        <div className="mt-3 flex justify-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-primary px-4 py-1.5 text-text">Global</span>
          <span
            className="cursor-not-allowed rounded-full border border-border px-4 py-1.5 text-text-muted opacity-60"
            title="Coming soon"
          >
            My Country
          </span>
        </div>
      </div>

      {loading && <LeaderboardSkeleton />}

      {!loading && error && (
        <div className="rounded-xl border border-error bg-surface p-8 text-center">
          <p className="font-metal text-lg text-error">COULDN&apos;T LOAD THE RANKINGS</p>
          <p className="mt-1 text-sm text-text-muted">Try refreshing the page.</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-metal text-lg text-gold">BE THE FIRST TO CLAIM THE THRONE</p>
          <p className="mt-1 text-sm text-text-muted">No one has scored TRVE POINTS yet.</p>
        </div>
      )}

      {!loading && top3.length > 0 && (
        <div className="flex items-end gap-3">
          {top3.map((entry) => (
            <PodiumSpot key={entry.id} entry={entry} place={(entry.rank as 1 | 2 | 3) ?? 1} />
          ))}
        </div>
      )}

      {!loading && rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <span className="w-8 shrink-0 text-center font-metal text-sm text-text-muted">{entry.rank}</span>
              <AvatarBadge entry={entry} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {entry.country_code && <span className="mr-1">{flagEmoji(entry.country_code)}</span>}
                  {entry.username}
                </p>
                <p className="text-xs text-text-muted">LEVEL {entry.level} · {getLevelName(entry.level)}</p>
              </div>
              <span className="shrink-0 font-metal text-sm text-gold">{entry.trve_points.toLocaleString()} TP</span>
            </div>
          ))}
        </div>
      )}

      {!loading && currentUser && !currentUserInTop50 && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-2xl border-t border-gold bg-surface-elevated px-4 py-3 md:bottom-0">
          <div className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-center font-metal text-sm text-gold">{currentUser.rank}</span>
            <AvatarBadge entry={currentUser} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gold">
                YOU&apos;RE #{currentUser.rank} WORLDWIDE
              </p>
            </div>
            <span className="shrink-0 font-metal text-sm text-gold">
              {currentUser.trve_points.toLocaleString()} TP
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
