"use client";

import { motion } from "framer-motion";
import { ONBOARDING_GENRES } from "@/lib/onboarding";

interface StepGenresProps {
  selected: string[];
  onToggle: (genreId: string) => void;
  onContinue: () => void;
}

export function StepGenres({ selected, onToggle, onContinue }: StepGenresProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3 }}
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Step 1 of 3</p>
        <h1 className="mt-2 font-metal text-2xl leading-tight text-text">
          YOUR KNOWLEDGE HAS A GENRE. PICK YOURS.
        </h1>
        <p className="mt-2 text-sm text-text-muted">Choose up to 3 genres.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ONBOARDING_GENRES.map((genre) => {
          const isSelected = selected.includes(genre.id);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={genre.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(genre.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-gold bg-gold/10"
                  : isDisabled
                    ? "border-border opacity-40"
                    : "border-border bg-surface hover:border-primary"
              }`}
            >
              <span className="text-3xl">{genre.emoji}</span>
              <span className="text-xs font-semibold text-text">{genre.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={selected.length === 0}
        onClick={onContinue}
        className="rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        CONTINUE
      </button>
    </motion.div>
  );
}
