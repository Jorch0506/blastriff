"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/stores/gameStore";

export default function ResultsPage() {
  const router = useRouter();
  const phase = useGameStore((state) => state.phase);
  const answers = useGameStore((state) => state.answers);
  const questions = useGameStore((state) => state.questions);
  const score = useGameStore((state) => state.score);
  const maxStreak = useGameStore((state) => state.maxStreak);
  const genre = useGameStore((state) => state.genre);
  const mode = useGameStore((state) => state.mode);
  const sessionId = useGameStore((state) => state.sessionId);
  const startTime = useGameStore((state) => state.startTime);
  const completeGame = useGameStore((state) => state.completeGame);
  const resetGame = useGameStore((state) => state.resetGame);

  const submittedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number; newLevelName: string } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (phase !== "complete" || questions.length === 0) {
      router.replace("/play");
    }
  }, [phase, questions.length, router]);

  useEffect(() => {
    if (submittedRef.current) return;
    if (phase !== "complete") return;
    if (sessionId !== null) return;
    if (mode === "practice") return;

    submittedRef.current = true;
    setIsSubmitting(true);

    fetch("/api/game/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        genre,
        answers,
        durationSeconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        completeGame(data.sessionId ?? null);
        if (data.levelUp) {
          setLevelUpInfo({ newLevel: data.newLevel, newLevelName: data.newLevelName });
        }
      })
      .finally(() => setIsSubmitting(false));
  }, [phase, sessionId, mode, genre, answers, startTime, completeGame]);

  useEffect(() => {
    if (phase !== "complete") return;
    const duration = 900;
    const startedAt = Date.now();
    let frame: number;

    function tick() {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(score * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, score]);

  if (phase !== "complete" || questions.length === 0) return null;

  const correctCount = answers.filter((answer) => answer.correct).length;

  function handlePlayAgain() {
    resetGame();
    router.push("/play");
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}/api/og/results?score=${score}&correct=${correctCount}&total=${questions.length}&genre=${encodeURIComponent(genre)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BLAST RIFF",
          text: `I scored ${score} TRVE POINTS on Blast Riff! Can you beat this?`,
          url: shareUrl,
        });
      } catch {
        // user cancelled the share sheet
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center gap-6 px-4 py-12 text-center">
      <h1 className="font-metal text-3xl text-text">RESULTS</h1>

      <div className="font-metal text-5xl text-gold">{displayScore.toLocaleString()} TP</div>

      <p className="text-lg font-semibold text-text">
        {correctCount} / {questions.length} CORRECT
      </p>
      <p className="text-sm text-text-muted">Best streak: {maxStreak} 🔥</p>
      {isSubmitting && <p className="text-xs text-text-muted">Saving your session...</p>}

      <div className="w-full space-y-3 rounded-xl border border-border bg-surface p-4 text-left">
        {questions.map((question, index) => {
          const answer = answers[index];
          return (
            <div key={question.id} className="flex items-start gap-2 text-sm">
              <span className={answer?.correct ? "text-success" : "text-error"}>
                {answer?.correct ? "✓" : "✗"}
              </span>
              <div className="flex-1">
                <p className="text-text">{question.question_text}</p>
                {!answer?.correct && (
                  <p className="text-xs text-text-muted">
                    Correct: {question.options.find((option) => option.id === answer?.correctOptionId)?.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={handlePlayAgain}
          className="rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover"
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-lg border border-gold py-3 font-metal text-lg tracking-wide text-gold transition-colors hover:bg-gold/10"
        >
          SHARE RESULT
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-border py-3 text-center font-metal text-lg tracking-wide text-text-muted transition-colors hover:text-text"
        >
          GO TO DASHBOARD
        </Link>
      </div>

      {levelUpInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="animate-pulse-gold rounded-2xl border-2 border-gold bg-surface p-8 text-center">
            <p className="font-metal text-2xl text-gold">LEVEL UP!</p>
            <p className="mt-2 text-text">You are now {levelUpInfo.newLevelName}</p>
            <button
              type="button"
              onClick={() => setLevelUpInfo(null)}
              className="mt-6 rounded-lg bg-primary px-6 py-2 font-metal text-text"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
