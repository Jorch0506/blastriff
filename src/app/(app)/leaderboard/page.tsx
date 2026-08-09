"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { flagEmoji } from "@/lib/onboarding";
import { getLevelName } from "@/lib/game/levels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/database";

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
};

type CountryLeaderboardResponse = LeaderboardResponse & {
  countryCode: string | null;
};

type TabKey = "global" | "country";

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

function LeaderboardList({
  entries,
  currentUser,
  emptyTitle,
  emptyBody,
}: {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  emptyTitle: string;
  emptyBody: string;
}) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const currentUserInList = currentUser ? entries.some((entry) => entry.id === currentUser.id) : true;

  return (
    <>
      {entries.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-metal text-lg text-gold">{emptyTitle}</p>
          <p className="mt-1 text-sm text-text-muted">{emptyBody}</p>
        </div>
      )}

      {top3.length > 0 && (
        <div className="flex items-end gap-3">
          {top3.map((entry) => (
            <PodiumSpot key={entry.id} entry={entry} place={(entry.rank as 1 | 2 | 3) ?? 1} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="w-8 shrink-0 text-center font-metal text-sm text-text-muted">{entry.rank}</span>
              <AvatarBadge entry={entry} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {entry.country_code && <span className="mr-1">{flagEmoji(entry.country_code)}</span>}
                  {entry.username}
                </p>
                <p className="text-xs text-text-muted">
                  LEVEL {entry.level} · {getLevelName(entry.level)}
                </p>
              </div>
              <span className="shrink-0 font-metal text-sm text-gold">{entry.trve_points.toLocaleString()} TP</span>
            </div>
          ))}
        </div>
      )}

      {currentUser && !currentUserInList && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-2xl border-t border-gold bg-surface-elevated px-4 py-3 md:bottom-0">
          <div className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-center font-metal text-sm text-gold">{currentUser.rank}</span>
            <AvatarBadge entry={currentUser} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gold">YOU&apos;RE #{currentUser.rank}</p>
            </div>
            <span className="shrink-0 font-metal text-sm text-gold">{currentUser.trve_points.toLocaleString()} TP</span>
          </div>
        </div>
      )}
    </>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<TabKey>("global");

  const [globalData, setGlobalData] = useState<LeaderboardResponse | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState(false);

  const [countryData, setCountryData] = useState<CountryLeaderboardResponse | null>(null);
  const [countryLoading, setCountryLoading] = useState(true);
  const [countryError, setCountryError] = useState(false);

  const fetchGlobal = useCallback(async () => {
    const response = await fetch("/api/leaderboard?type=global&limit=50");
    if (response.ok) {
      setGlobalData((await response.json()) as LeaderboardResponse);
      setGlobalError(false);
    } else {
      setGlobalError(true);
    }
    setGlobalLoading(false);
  }, []);

  const fetchCountry = useCallback(async () => {
    const response = await fetch("/api/leaderboard/country?limit=50");
    if (response.ok) {
      setCountryData((await response.json()) as CountryLeaderboardResponse);
      setCountryError(false);
    } else {
      setCountryError(true);
    }
    setCountryLoading(false);
  }, []);

  useEffect(() => {
    fetchGlobal();
    fetchCountry();
    const interval = setInterval(() => {
      fetchGlobal();
      fetchCountry();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchGlobal, fetchCountry]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 pb-24">
      <div className="text-center">
        <h1 className="font-metal text-2xl text-text">THE PIT RANKINGS</h1>
        <div className="mt-3 flex justify-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setTab("global")}
            className={cn(
              "rounded-full px-4 py-1.5 transition-colors",
              tab === "global" ? "bg-primary text-text" : "border border-border text-text-muted hover:text-text"
            )}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setTab("country")}
            className={cn(
              "flex items-center gap-1 rounded-full px-4 py-1.5 transition-colors",
              tab === "country" ? "bg-primary text-text" : "border border-border text-text-muted hover:text-text"
            )}
          >
            {countryData?.countryCode && <span>{flagEmoji(countryData.countryCode)}</span>}
            My Country
          </button>
        </div>
      </div>

      {tab === "global" && (
        <>
          {globalLoading && <LeaderboardSkeleton />}
          {!globalLoading && globalError && (
            <div className="rounded-xl border border-error bg-surface p-8 text-center">
              <p className="font-metal text-lg text-error">COULDN&apos;T LOAD THE RANKINGS</p>
              <p className="mt-1 text-sm text-text-muted">Try refreshing the page.</p>
            </div>
          )}
          {!globalLoading && !globalError && (
            <LeaderboardList
              entries={globalData?.entries ?? []}
              currentUser={globalData?.currentUser ?? null}
              emptyTitle="BE THE FIRST TO CLAIM THE THRONE"
              emptyBody="No one has scored TRVE POINTS yet."
            />
          )}
        </>
      )}

      {tab === "country" && (
        <>
          {countryLoading && <LeaderboardSkeleton />}
          {!countryLoading && countryError && (
            <div className="rounded-xl border border-error bg-surface p-8 text-center">
              <p className="font-metal text-lg text-error">COULDN&apos;T LOAD THE RANKINGS</p>
              <p className="mt-1 text-sm text-text-muted">Try refreshing the page.</p>
            </div>
          )}
          {!countryLoading && !countryError && countryData?.countryCode === null && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="font-metal text-lg text-gold">NO COUNTRY SET</p>
              <p className="mt-1 text-sm text-text-muted">Set your country in your profile to see country rankings.</p>
            </div>
          )}
          {!countryLoading && !countryError && countryData?.countryCode && (
            <LeaderboardList
              entries={countryData.entries}
              currentUser={countryData.currentUser}
              emptyTitle="BE THE FIRST IN YOUR COUNTRY"
              emptyBody="No one from your country has scored TRVE POINTS yet."
            />
          )}
        </>
      )}
    </main>
  );
}
