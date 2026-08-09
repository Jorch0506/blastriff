"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import { ScoreBar } from "@/components/game/ScoreBar";
import { QuestionCard } from "@/components/game/QuestionCard";
import { cn } from "@/lib/utils";
import type { ClientQuestion, GameMode } from "@/types/game";

const GENRES: { id: string; label: string; emoji: string }[] = [
  { id: "thrash", label: "Thrash Metal", emoji: "⚡" },
  { id: "death", label: "Death Metal", emoji: "💀" },
  { id: "black", label: "Black Metal", emoji: "🐺" },
  { id: "doom", label: "Doom Metal", emoji: "⛓️" },
  { id: "power", label: "Power Metal", emoji: "🔥" },
  { id: "all", label: "All Metal", emoji: "🤘" },
];

export default function PlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phase = useGameStore((state) => state.phase);
  const questions = useGameStore((state) => state.questions);
  const currentIndex = useGameStore((state) => state.currentIndex);
  const startGame = useGameStore((state) => state.startGame);

  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") ?? "");
  const [selectedMode, setSelectedMode] = useState<GameMode>("gauntlet");
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "complete") {
      router.replace("/play/results");
    }
  }, [phase, router]);

  async function handleStart() {
    if (!selectedGenre) return;
    setIsLoadingQuestions(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/questions?genre=${encodeURIComponent(selectedGenre)}&limit=10&language=en`
      );
      if (!response.ok) throw new Error("Failed to load questions");
      const data: { questions: ClientQuestion[] } = await response.json();
      if (!data.questions.length) {
        setLoadError("No questions available for this genre yet.");
        return;
      }
      startGame(selectedGenre, selectedMode, data.questions);
    } catch {
      setLoadError("Couldn't load questions. Try again.");
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  if (phase === "playing" || phase === "feedback") {
    const question = questions[currentIndex];
    if (!question) return null;
    return (
      <div className="flex min-h-screen flex-col bg-background pb-10">
        <ScoreBar />
        <div className="flex flex-1 items-start justify-center pt-8">
          <QuestionCard
            key={question.id}
            question={question}
            currentNumber={currentIndex + 1}
            total={questions.length}
          />
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-metal text-xl text-gold">CALCULATING YOUR FATE...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="font-metal text-3xl text-text">CHOOSE YOUR GENRE</h1>
        <p className="mt-2 text-sm text-text-muted">Pick your poison. 10 questions await.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => setSelectedGenre(genre.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-colors",
              selectedGenre === genre.id
                ? "border-primary bg-primary/10"
                : "border-border bg-surface hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{genre.emoji}</span>
            <span className="text-sm font-semibold text-text">{genre.label}</span>
          </button>
        ))}
      </div>

      <div className="flex rounded-lg border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setSelectedMode("practice")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-semibold tracking-wide transition-colors",
            selectedMode === "practice" ? "bg-primary text-text" : "text-text-muted hover:text-text"
          )}
        >
          PRACTICE
        </button>
        <button
          type="button"
          onClick={() => setSelectedMode("gauntlet")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-semibold tracking-wide transition-colors",
            selectedMode === "gauntlet" ? "bg-primary text-text" : "text-text-muted hover:text-text"
          )}
        >
          GAUNTLET
        </button>
      </div>

      {loadError && <p className="text-center text-sm text-error">{loadError}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={!selectedGenre || isLoadingQuestions}
        className="rounded-lg bg-primary py-4 font-metal text-xl tracking-wide text-text transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isLoadingQuestions ? "LOADING YOUR DOOM..." : "START PLAYING"}
      </button>
    </main>
  );
}
