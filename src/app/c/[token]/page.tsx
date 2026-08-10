"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChallengePlay } from "@/components/challenges/ChallengePlay";
import type { AnswerRecord, ClientQuestion } from "@/types/game";
import type { QuestionDifficulty } from "@/types/database";

type ParticipantInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number | null;
  correct: number | null;
  timeSeconds: number | null;
  completedAt: string | null;
};

type ChallengeData = {
  id: string;
  genre: string;
  difficulty: QuestionDifficulty;
  pointsAtStake: number;
  status: "pending" | "active" | "completed" | "expired" | "declined";
  expiresAt: string;
  createdAt: string;
  winnerId: string | null;
  questionCount: number;
  challenger: ParticipantInfo | null;
  challenged: ParticipantInfo | null;
};

type ChallengeResponse = {
  challenge: ChallengeData;
  viewer: {
    isAuthenticated: boolean;
    role: "challenger" | "challenged" | "visitor" | "anonymous";
    canPlay: boolean;
    playingAs: "challenger" | "challenged" | null;
  };
  questions?: ClientQuestion[];
};

type SubmitResult =
  | { role: "challenger"; score: number; correct: number; total: number }
  | {
      won: boolean;
      score: number;
      correct: number;
      challengerScore: number;
      pointsWon: number;
      newTotalPoints: number;
    };

function ParticipantAvatar({ participant }: { participant: ParticipantInfo | null }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated text-3xl">
      {participant?.avatarUrl || participant?.username.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export default function ChallengeLandingPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ChallengeResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [stage, setStage] = useState<"info" | "playing" | "result">("info");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    const response = await fetch(`/api/challenges/${params.token}`);
    if (!response.ok) {
      setNotFound(true);
      return;
    }
    setData(await response.json());
  }, [params.token]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  async function handleComplete(playResult: { answers: AnswerRecord[]; score: number; maxStreak: number }) {
    const response = await fetch(`/api/challenges/${params.token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: playResult.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selected,
          timeMs: answer.timeMs,
        })),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setSubmitError(body.error ?? "Could not submit your result");
      setStage("info");
      await fetchChallenge();
      return;
    }
    setResult(body);
    await fetchChallenge();
    setStage("result");
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="font-metal text-2xl text-error">CHALLENGE NOT FOUND</h1>
        <p className="text-sm text-text-muted">This link may be broken or the challenge no longer exists.</p>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          Go to Blast Riff
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-metal text-lg text-gold">LOADING BATTLE...</p>
      </main>
    );
  }

  const { challenge, viewer } = data;

  if (stage === "playing" && data.questions) {
    return <ChallengePlay genre={challenge.genre} questions={data.questions} onComplete={handleComplete} />;
  }

  const isCompleted = challenge.status === "completed";
  const showComparison = isCompleted;
  const showWaitingForOpponent = !isCompleted && stage === "result" && result !== null && "role" in result;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-center font-metal text-xl text-primary">
        BLAST⚡RIFF
      </Link>

      {!showComparison && !showWaitingForOpponent && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <ParticipantAvatar participant={challenge.challenger} />
          <h1 className="font-metal text-xl text-text">
            {challenge.challenger?.username ?? "A metalhead"} challenged you to a {challenge.genre.toUpperCase()}{" "}
            battle!
          </h1>
          {challenge.challenger?.score !== null && challenge.challenger?.score !== undefined && (
            <p className="font-metal text-2xl text-gold">
              Can you beat {challenge.challenger.score.toLocaleString()} TP?
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {challenge.difficulty} · {challenge.pointsAtStake} TP at stake · {challenge.questionCount} questions
          </p>
        </div>
      )}

      {submitError && <p className="text-center text-sm text-error">{submitError}</p>}

      {!showComparison && !showWaitingForOpponent && !viewer.isAuthenticated && (
        <button
          type="button"
          onClick={() => router.push(`/login?redirectTo=/c/${params.token}`)}
          className="rounded-lg bg-primary py-4 font-metal text-xl tracking-wide text-text transition-colors hover:bg-primary-hover"
        >
          ACCEPT THE CHALLENGE
        </button>
      )}

      {!showComparison && !showWaitingForOpponent && viewer.isAuthenticated && viewer.canPlay && data.questions && (
        <button
          type="button"
          onClick={() => setStage("playing")}
          className="rounded-lg bg-primary py-4 font-metal text-xl tracking-wide text-text transition-colors hover:bg-primary-hover"
        >
          {viewer.playingAs === "challenger" ? "PLAY YOUR TURN" : "START THE BATTLE"}
        </button>
      )}

      {!showComparison && !showWaitingForOpponent && viewer.isAuthenticated && !viewer.canPlay && (
        <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
          {challenge.status === "expired"
            ? "This challenge has expired."
            : viewer.role === "challenger"
              ? "Waiting for someone to accept your challenge."
              : "This challenge has already been claimed by someone else."}
        </div>
      )}

      {showWaitingForOpponent && result && "role" in result && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-metal text-xl text-text">YOU SCORED {result.score.toLocaleString()} TP</p>
          <p className="text-sm text-text-muted">
            {result.correct}/{result.total} correct
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Waiting for your opponent to play their turn.
          </p>
        </div>
      )}

      {showComparison && (
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-metal text-2xl text-gold">
            {challenge.winnerId === null
              ? "IT'S A DRAW"
              : challenge.winnerId === challenge.challenger?.id
                ? `${challenge.challenger?.username?.toUpperCase()} WINS`
                : `${challenge.challenged?.username?.toUpperCase() ?? "CHALLENGER"} WINS`}
          </p>

          <div className="flex items-center justify-around gap-4">
            <div className="flex flex-col items-center gap-2">
              <ParticipantAvatar participant={challenge.challenger} />
              <p className="text-sm font-semibold text-text">{challenge.challenger?.username}</p>
              <p className="font-metal text-lg text-gold">{(challenge.challenger?.score ?? 0).toLocaleString()} TP</p>
              <p className="text-xs text-text-muted">{challenge.challenger?.correct}/{challenge.questionCount} correct</p>
            </div>
            <span className="font-metal text-lg text-text-muted">VS</span>
            <div className="flex flex-col items-center gap-2">
              <ParticipantAvatar participant={challenge.challenged} />
              <p className="text-sm font-semibold text-text">{challenge.challenged?.username ?? "?"}</p>
              <p className="font-metal text-lg text-gold">{(challenge.challenged?.score ?? 0).toLocaleString()} TP</p>
              <p className="text-xs text-text-muted">{challenge.challenged?.correct}/{challenge.questionCount} correct</p>
            </div>
          </div>

          {result && !("role" in result) && (
            <p className={result.pointsWon >= 0 ? "font-metal text-lg text-success" : "font-metal text-lg text-error"}>
              {result.pointsWon > 0 ? `+${result.pointsWon}` : result.pointsWon} TP
            </p>
          )}

          <Link
            href="/challenges"
            className="rounded-lg border border-gold py-3 font-metal text-lg tracking-wide text-gold transition-colors hover:bg-gold/10"
          >
            CHALLENGE THEM BACK
          </Link>
        </div>
      )}
    </main>
  );
}
