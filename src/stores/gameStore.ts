import { create } from "zustand";
import type { AnswerRecord, ClientQuestion, GameMode, GamePhase } from "@/types/game";

interface GameState {
  phase: GamePhase;
  questions: ClientQuestion[];
  currentIndex: number;
  selectedOption: string | null;
  answers: AnswerRecord[];
  score: number;
  currentStreak: number;
  maxStreak: number;
  startTime: number | null;
  questionStartTime: number | null;
  genre: string;
  mode: GameMode;
  sessionId: string | null;

  startGame: (genre: string, mode: GameMode, questions: ClientQuestion[]) => void;
  selectAnswer: (option: string) => void;
  recordAnswer: (answer: AnswerRecord) => void;
  nextQuestion: () => void;
  completeGame: (sessionId?: string | null) => void;
  resetGame: () => void;
}

const initialState = {
  phase: "idle" as GamePhase,
  questions: [] as ClientQuestion[],
  currentIndex: 0,
  selectedOption: null as string | null,
  answers: [] as AnswerRecord[],
  score: 0,
  currentStreak: 0,
  maxStreak: 0,
  startTime: null as number | null,
  questionStartTime: null as number | null,
  genre: "",
  mode: "practice" as GameMode,
  sessionId: null as string | null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  startGame: (genre, mode, questions) =>
    set({
      ...initialState,
      phase: "playing",
      questions,
      genre,
      mode,
      startTime: Date.now(),
      questionStartTime: Date.now(),
    }),

  selectAnswer: (option) => {
    if (get().selectedOption) return;
    set({ selectedOption: option, phase: "feedback" });
  },

  recordAnswer: (answer) =>
    set((state) => {
      const nextStreak = answer.correct ? state.currentStreak + 1 : 0;
      return {
        answers: [...state.answers, answer],
        score: state.score + answer.pointsEarned,
        currentStreak: nextStreak,
        maxStreak: Math.max(state.maxStreak, nextStreak),
      };
    }),

  nextQuestion: () =>
    set((state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { phase: "complete" };
      }
      return {
        currentIndex: nextIndex,
        selectedOption: null,
        phase: "playing",
        questionStartTime: Date.now(),
      };
    }),

  completeGame: (sessionId = null) => set({ phase: "complete", sessionId }),

  resetGame: () => set({ ...initialState }),
}));
