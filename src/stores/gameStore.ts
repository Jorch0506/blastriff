import { create } from "zustand";
import type { GameSessionQuestion } from "@/types/database";

interface GameState {
  isPlaying: boolean;
  currentQuestionIndex: number;
  answers: GameSessionQuestion[];
  score: number;
  streak: number;
  startGame: () => void;
  recordAnswer: (answer: GameSessionQuestion) => void;
  endGame: () => void;
  reset: () => void;
}

const initialState = {
  isPlaying: false,
  currentQuestionIndex: 0,
  answers: [] as GameSessionQuestion[],
  score: 0,
  streak: 0,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  startGame: () => set({ ...initialState, isPlaying: true }),
  recordAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers, answer],
      currentQuestionIndex: state.currentQuestionIndex + 1,
      score: answer.correct ? state.score + 1 : state.score,
      streak: answer.correct ? state.streak + 1 : 0,
    })),
  endGame: () => set({ isPlaying: false }),
  reset: () => set(initialState),
}));
