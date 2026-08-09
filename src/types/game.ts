import type { QuestionDifficulty, QuestionOption, QuestionType } from "@/types/database";

export type ClientQuestion = {
  id: string;
  question_text: string;
  options: QuestionOption[];
  difficulty: QuestionDifficulty;
  genre: string;
  question_type: QuestionType;
};

export type AnswerRecord = {
  questionId: string;
  selected: string | null;
  correct: boolean;
  timeMs: number;
  pointsEarned: number;
  correctOptionId: string;
};

export type GameMode = "gauntlet" | "daily" | "practice";

export type GamePhase = "idle" | "loading" | "playing" | "feedback" | "complete";

export type QuestionVerification = {
  correct_option: string;
  explanation: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
};
