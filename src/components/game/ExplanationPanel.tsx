"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplanationPanelProps {
  correct: boolean;
  correctOptionText: string;
  explanation: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  pointsEarned: number;
}

export function ExplanationPanel({
  correct,
  correctOptionText,
  explanation,
  youtubeUrl,
  spotifyUrl,
  pointsEarned,
}: ExplanationPanelProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <p className={cn("font-metal text-lg", correct ? "text-success" : "text-error")}>
        {correct ? (
          <>
            🔥 TRVE KVLT! <span className="text-gold">+{pointsEarned} TRVE POINTS</span>
          </>
        ) : (
          `POSEUR MOVE. The correct answer was ${correctOptionText}`
        )}
      </p>
      {explanation && <p className="mt-2 text-sm text-text-muted">{explanation}</p>}
      {(youtubeUrl || spotifyUrl) && (
        <div className="mt-3 flex gap-4">
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
            >
              <ExternalLink size={14} /> YouTube
            </a>
          )}
          {spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
            >
              <ExternalLink size={14} /> Spotify
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
