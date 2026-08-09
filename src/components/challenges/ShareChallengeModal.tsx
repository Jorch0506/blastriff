"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, X } from "lucide-react";

interface ShareChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  genre: string;
}

export function ShareChallengeModal({ isOpen, onClose, shareUrl, genre }: ShareChallengeModalProps) {
  const [copied, setCopied] = useState(false);

  const genreLabel = genre.toUpperCase();
  const whatsAppMessage = `⚔️ I challenged you on Blast Riff! Prove you know more about ${genreLabel} than me. Accept here: ${shareUrl} 🤘`;
  const twitterMessage = `⚔️ Just challenged the pit on @BlastRiff! ${genreLabel} trivia battle. ${shareUrl} #BlastRiff #HeavyMetal 🤘`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-t-2xl border-t-4 border-gold bg-surface p-6 shadow-2xl sm:rounded-2xl sm:border-t-4"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text"
            >
              <X size={20} />
            </button>

            <h2 className="mb-2 font-metal text-2xl text-gold">CHALLENGE READY</h2>
            <p className="mb-6 text-sm text-text-muted">
              ⚔️ I challenged you! Can you beat my score on Blast Riff?
            </p>

            <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-background p-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 truncate bg-transparent px-2 text-sm text-text outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-primary-hover"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Share on WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated py-3 text-sm font-bold text-text transition-colors hover:border-primary"
              >
                Share on X
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
              >
                DONE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
