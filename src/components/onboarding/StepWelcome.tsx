"use client";

import { motion } from "framer-motion";

interface StepWelcomeProps {
  username: string;
  avatar: string;
  onEnter: () => void;
}

export function StepWelcome({ username, avatar, onEnter }: StepWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-12 text-center"
    >
      <motion.span
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-6xl"
      >
        {avatar}
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="font-metal text-3xl text-gold"
      >
        WELCOME, {username.toUpperCase()}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="text-sm text-text-muted"
      >
        YOU ARE NOW A POSEUR. PROVE US WRONG.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="w-full rounded-xl border border-border bg-surface p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">LEVEL 1 · POSEUR</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
          <div className="h-full w-0 bg-gold" />
        </div>
        <p className="mt-1 text-xs text-text-muted">0 TP · 500 TP to next level</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        type="button"
        onClick={onEnter}
        className="w-full rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover"
      >
        ENTER THE PIT
      </motion.button>
    </motion.div>
  );
}
