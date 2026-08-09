"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { calculatePoints, numberFromDifficulty } from "@/lib/game/scoring";
import { Timer } from "./Timer";
import { AnswerButton, type AnswerButtonState } from "./AnswerButton";
import { ExplanationPanel } from "./ExplanationPanel";
import type { AnswerRecord, ClientQuestion, QuestionVerification } from "@/types/game";

const LETTERS = ["A", "B", "C", "D"];
const QUESTION_DURATION = 30;
const NEXT_DELAY_MS = 2500;

interface QuestionCardProps {
  question: ClientQuestion;
  currentNumber: number;
  total: number;
  onAnswer?: (answer: AnswerRecord) => void;
}

export function QuestionCard({ question, currentNumber, total, onAnswer }: QuestionCardProps) {
  const currentStreak = useGameStore((state) => state.currentStreak);
  const recordAnswer = useGameStore((state) => state.recordAnswer);
  const nextQuestion = useGameStore((state) => state.nextQuestion);

  const [locked, setLocked] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [verification, setVerification] = useState<QuestionVerification | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [questionStart] = useState(() => Date.now());

  useEffect(() => {
    setLocked(false);
    setPickedOption(null);
    setVerification(null);
    setLastPoints(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  async function submit(selected: string | null) {
    if (locked) return;
    setLocked(true);
    setPickedOption(selected);
    const timeMs = Date.now() - questionStart;

    let data: QuestionVerification;
    try {
      const response = await fetch(`/api/questions/${question.id}`);
      if (!response.ok) throw new Error("verification failed");
      data = await response.json();
    } catch {
      data = { correct_option: "", explanation: null, youtube_url: null, spotify_url: null };
    }

    const correct = selected !== null && selected === data.correct_option;
    const streakAfter = correct ? currentStreak + 1 : 0;
    const pointsEarned = calculatePoints({
      difficulty: question.difficulty,
      timeMs,
      correct,
      streakAfterAnswer: streakAfter,
    });

    const record: AnswerRecord = {
      questionId: question.id,
      selected,
      correct,
      timeMs,
      pointsEarned,
      correctOptionId: data.correct_option,
    };

    setVerification(data);
    setLastPoints(pointsEarned);
    recordAnswer(record);
    onAnswer?.(record);

    setTimeout(() => {
      nextQuestion();
    }, NEXT_DELAY_MS);
  }

  function getButtonState(optionId: string): AnswerButtonState {
    if (!locked) return "default";
    if (verification) {
      if (optionId === verification.correct_option) return "correct";
      if (optionId === pickedOption) return "incorrect";
      return "disabled";
    }
    if (optionId === pickedOption) return "selected";
    return "disabled";
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {question.genre}
          </span>
          <span className="text-xs font-semibold text-gold">
            {"★".repeat(numberFromDifficulty(question.difficulty))}
          </span>
        </div>
        <span className="text-xs font-semibold text-text-muted">
          {currentNumber} / {total}
        </span>
      </div>

      <div className="flex justify-center">
        <Timer key={question.id} duration={QUESTION_DURATION} onExpire={() => submit(null)} />
      </div>

      <h2 className="text-balance text-center text-xl font-bold text-text sm:text-2xl">
        {question.question_text}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <AnswerButton
            key={option.id}
            option={option}
            letter={LETTERS[index] ?? "?"}
            state={getButtonState(option.id)}
            onClick={() => submit(option.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {verification && (
          <ExplanationPanel
            correct={pickedOption !== null && pickedOption === verification.correct_option}
            correctOptionText={
              question.options.find((option) => option.id === verification.correct_option)?.text ?? ""
            }
            explanation={verification.explanation}
            youtubeUrl={verification.youtube_url}
            spotifyUrl={verification.spotify_url}
            pointsEarned={lastPoints}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
