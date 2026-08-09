"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { POINTS_AT_STAKE_OPTIONS } from "@/lib/challenges";
import { ChallengePlay } from "@/components/challenges/ChallengePlay";
import { ShareChallengeModal } from "@/components/challenges/ShareChallengeModal";
import type { AnswerRecord, ClientQuestion } from "@/types/game";
import type { QuestionDifficulty } from "@/types/database";

const GENRES: { id: string; label: string; emoji: string }[] = [
  { id: "thrash", label: "Thrash Metal", emoji: "⚡" },
  { id: "death", label: "Death Metal", emoji: "💀" },
  { id: "black", label: "Black Metal", emoji: "🐺" },
  { id: "doom", label: "Doom Metal", emoji: "⛓️" },
  { id: "power", label: "Power Metal", emoji: "🔥" },
  { id: "all", label: "All Metal", emoji: "🤘" },
];

const DIFFICULTIES: { id: QuestionDifficulty; label: string }[] = [
  { id: "easy", label: "EASY" },
  { id: "medium", label: "MEDIUM" },
  { id: "hard", label: "HARD" },
];

type ProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PendingChallenge = {
  id: string;
  shareToken: string;
  genre: string;
  difficulty: QuestionDifficulty;
  pointsAtStake: number;
  shareUrl: string;
  expiresAt: string;
  createdAt: string;
  challenger: ProfileSummary | null;
};

type MyChallenge = {
  id: string;
  shareToken: string;
  genre: string;
  difficulty: QuestionDifficulty;
  pointsAtStake: number;
  status: "pending" | "active" | "completed" | "expired" | "declined";
  shareUrl: string;
  expiresAt: string;
  createdAt: string;
  challengerScore: number | null;
  challengedScore: number | null;
  won: boolean;
  isDraw: boolean;
  challenged: ProfileSummary | null;
};

type Stage = "browse" | "playing" | "share";

function timeRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return `${Math.max(1, Math.floor(diffMs / (1000 * 60)))}m left`;
  if (hours < 48) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function Avatar({ profile }: { profile: ProfileSummary | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-lg">
      {profile?.avatar_url || profile?.username.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export default function ChallengesPage() {
  const [genre, setGenre] = useState("thrash");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("medium");
  const [pointsAtStake, setPointsAtStake] = useState<(typeof POINTS_AT_STAKE_OPTIONS)[number]>(100);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("browse");
  const [activeChallenge, setActiveChallenge] = useState<{
    shareToken: string;
    shareUrl: string;
    genre: string;
    questions: ClientQuestion[];
  } | null>(null);

  const [pending, setPending] = useState<PendingChallenge[]>([]);
  const [mine, setMine] = useState<MyChallenge[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    const response = await fetch("/api/challenges");
    if (response.ok) {
      const data = await response.json();
      setPending(data.pending ?? []);
      setMine(data.mine ?? []);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  async function handleCreate() {
    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, difficulty, pointsAtStake }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCreateError(data.error ?? "Could not create challenge");
        return;
      }
      setActiveChallenge({
        shareToken: data.shareToken,
        shareUrl: data.shareUrl,
        genre,
        questions: data.questions,
      });
      setStage("playing");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleChallengerComplete(result: { answers: AnswerRecord[]; score: number; maxStreak: number }) {
    if (!activeChallenge) return;
    await fetch(`/api/challenges/${activeChallenge.shareToken}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: result.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selected,
          timeMs: answer.timeMs,
        })),
      }),
    });
    setStage("share");
  }

  function handleShareClose() {
    setStage("browse");
    setActiveChallenge(null);
    fetchLists();
  }

  if (stage === "playing" && activeChallenge) {
    return (
      <ChallengePlay
        genre={activeChallenge.genre}
        questions={activeChallenge.questions}
        onComplete={handleChallengerComplete}
      />
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 pb-24">
      <div className="text-center">
        <h1 className="font-metal text-2xl text-text">⚔️ BATTLES</h1>
        <p className="mt-1 text-sm text-text-muted">Challenge a friend. Winner takes their TRVE POINTS.</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-metal text-lg text-text">CREATE A CHALLENGE</h2>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Genre</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {GENRES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setGenre(option.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-semibold transition-colors",
                genre === option.id ? "border-primary bg-primary/10 text-text" : "border-border text-text-muted hover:border-primary/50"
              )}
            >
              <span className="text-xl">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Difficulty</p>
        <div className="mb-4 flex gap-2">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDifficulty(option.id)}
              className={cn(
                "flex-1 rounded-lg border-2 py-2 text-xs font-semibold transition-colors",
                difficulty === option.id ? "border-primary bg-primary/10 text-text" : "border-border text-text-muted hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">TRVE Points at Stake</p>
        <div className="mb-5 flex gap-2">
          {POINTS_AT_STAKE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPointsAtStake(option)}
              className={cn(
                "flex-1 rounded-lg border-2 py-2 text-xs font-bold transition-colors",
                pointsAtStake === option ? "border-gold bg-gold/10 text-gold" : "border-border text-text-muted hover:border-gold/50"
              )}
            >
              {option} TP
            </button>
          ))}
        </div>

        {createError && <p className="mb-3 text-sm text-error">{createError}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isCreating ? "PREPARING YOUR ASSAULT..." : "CREATE CHALLENGE"}
        </button>
      </section>

      <section>
        <h2 className="mb-3 font-metal text-lg text-text">PENDING CHALLENGES</h2>
        {!listLoading && pending.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
            No one has challenged you yet.
          </div>
        )}
        <div className="space-y-2">
          {pending.map((challenge) => (
            <Link
              key={challenge.id}
              href={`/c/${challenge.shareToken}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
            >
              <Avatar profile={challenge.challenger} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {challenge.challenger?.username ?? "A metalhead"} challenged you
                </p>
                <p className="text-xs text-text-muted">
                  {challenge.genre.toUpperCase()} · {challenge.pointsAtStake} TP · {timeRemaining(challenge.expiresAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-text">ACCEPT</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-metal text-lg text-text">MY CHALLENGES</h2>
        {!listLoading && mine.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
            You haven&apos;t sent any challenges yet.
          </div>
        )}
        <div className="space-y-2">
          {mine.map((challenge) => (
            <div key={challenge.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <Avatar profile={challenge.challenged} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {challenge.challenged?.username ?? "Awaiting a challenger"}
                </p>
                <p className="text-xs text-text-muted">
                  {challenge.genre.toUpperCase()} · {challenge.pointsAtStake} TP
                </p>
              </div>
              {challenge.status === "completed" ? (
                <span className={cn("shrink-0 font-metal text-sm", challenge.isDraw ? "text-text-muted" : challenge.won ? "text-success" : "text-error")}>
                  {challenge.isDraw ? "DRAW" : challenge.won ? "WIN" : "LOSS"}
                </span>
              ) : challenge.status === "expired" ? (
                <span className="shrink-0 text-xs font-semibold text-text-muted">EXPIRED</span>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-gold">AWAITING RESPONSE</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {activeChallenge && (
        <ShareChallengeModal
          isOpen={stage === "share"}
          onClose={handleShareClose}
          shareUrl={activeChallenge.shareUrl}
          genre={activeChallenge.genre}
        />
      )}
    </main>
  );
}
