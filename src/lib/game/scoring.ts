import type { QuestionDifficulty } from "@/types/database";

const POINTS_PER_DIFFICULTY = 30;

export const DIFFICULTY_WEIGHT: Record<QuestionDifficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

export function getBasePoints(difficulty: QuestionDifficulty): number {
  return DIFFICULTY_WEIGHT[difficulty] * POINTS_PER_DIFFICULTY;
}

export function getTimeBonusMultiplier(timeMs: number): number {
  const seconds = timeMs / 1000;
  if (seconds < 5) return 2;
  if (seconds < 10) return 1.5;
  if (seconds < 20) return 1.25;
  return 1;
}

export function getStreakMultiplier(streakAfterAnswer: number): number {
  if (streakAfterAnswer >= 4) return 2;
  if (streakAfterAnswer === 3) return 1.5;
  if (streakAfterAnswer === 2) return 1.25;
  return 1;
}

export function calculatePoints(params: {
  difficulty: QuestionDifficulty;
  timeMs: number;
  correct: boolean;
  streakAfterAnswer: number;
}): number {
  if (!params.correct) return 0;
  const base = getBasePoints(params.difficulty);
  const timeBonus = getTimeBonusMultiplier(params.timeMs);
  const streakMultiplier = getStreakMultiplier(params.streakAfterAnswer);
  return Math.round(base * timeBonus * streakMultiplier);
}

export function difficultyFromNumber(value: number): QuestionDifficulty {
  if (value <= 2) return "easy";
  if (value === 3) return "medium";
  return "hard";
}

export function numberFromDifficulty(difficulty: QuestionDifficulty): number {
  return DIFFICULTY_WEIGHT[difficulty];
}
