"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { FloatingPoints } from "./FloatingPoints";

export function ScoreBar() {
  const score = useGameStore((state) => state.score);
  const currentStreak = useGameStore((state) => state.currentStreak);
  const currentIndex = useGameStore((state) => state.currentIndex);
  const total = useGameStore((state) => state.questions.length);

  const prevScore = useRef(score);
  const [floaters, setFloaters] = useState<{ id: number; amount: number }[]>([]);

  useEffect(() => {
    const delta = score - prevScore.current;
    prevScore.current = score;
    if (delta > 0) {
      const id = Date.now();
      setFloaters((current) => [...current, { id, amount: delta }]);
      const timeout = setTimeout(() => {
        setFloaters((current) => current.filter((floater) => floater.id !== id));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [score]);

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="relative flex items-center gap-1 font-metal text-lg text-gold">
        {score.toLocaleString()} TP
        {floaters.map((floater) => (
          <FloatingPoints key={floater.id} amount={floater.amount} />
        ))}
      </div>
      <span className="flex items-center gap-1 text-sm font-semibold text-text">🔥 {currentStreak}</span>
      <span className="text-sm font-semibold text-text-muted">
        {Math.min(currentIndex + 1, total)}/{total}
      </span>
    </div>
  );
}
