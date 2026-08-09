"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/types/database";

export type AnswerButtonState = "default" | "selected" | "correct" | "incorrect" | "disabled";

interface AnswerButtonProps {
  option: QuestionOption;
  letter: string;
  state: AnswerButtonState;
  onClick: () => void;
}

const STATE_STYLES: Record<AnswerButtonState, string> = {
  default: "border-border bg-surface hover:scale-[1.02] hover:border-primary/60",
  selected: "border-gold bg-surface",
  correct: "border-success bg-success/10",
  incorrect: "border-error bg-error/10 animate-shake",
  disabled: "border-border bg-surface opacity-50",
};

export function AnswerButton({ option, letter, state, onClick }: AnswerButtonProps) {
  const isLocked = state !== "default";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150",
        STATE_STYLES[state]
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-text-muted">
        {letter}
      </span>
      <span className="flex-1 text-sm font-semibold text-text sm:text-base">{option.text}</span>
      {state === "correct" && <Check className="shrink-0 text-success" size={20} />}
      {state === "incorrect" && <X className="shrink-0 text-error" size={20} />}
    </button>
  );
}
