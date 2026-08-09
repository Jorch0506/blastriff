"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/gameStore";
import { ScoreBar } from "@/components/game/ScoreBar";
import { QuestionCard } from "@/components/game/QuestionCard";
import type { AnswerRecord, ClientQuestion } from "@/types/game";

interface ChallengePlayProps {
  genre: string;
  questions: ClientQuestion[];
  onComplete: (result: { answers: AnswerRecord[]; score: number; maxStreak: number }) => void;
}

export function ChallengePlay({ genre, questions, onComplete }: ChallengePlayProps) {
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const phase = useGameStore((state) => state.phase);
  const storeQuestions = useGameStore((state) => state.questions);
  const currentIndex = useGameStore((state) => state.currentIndex);
  const answers = useGameStore((state) => state.answers);
  const score = useGameStore((state) => state.score);
  const maxStreak = useGameStore((state) => state.maxStreak);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(genre, "challenge", questions);
  }, [genre, questions, startGame]);

  useEffect(() => {
    if (phase !== "complete" || completedRef.current) return;
    completedRef.current = true;
    onComplete({ answers, score, maxStreak });
    resetGame();
  }, [phase, answers, score, maxStreak, onComplete, resetGame]);

  if (phase === "playing" || phase === "feedback") {
    const question = storeQuestions[currentIndex];
    if (!question) return null;
    return (
      <div className="flex min-h-screen flex-col bg-background pb-10">
        <ScoreBar />
        <div className="flex flex-1 items-start justify-center pt-8">
          <QuestionCard
            key={question.id}
            question={question}
            currentNumber={currentIndex + 1}
            total={storeQuestions.length}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-metal text-xl text-gold">CALCULATING YOUR FATE...</p>
    </div>
  );
}
