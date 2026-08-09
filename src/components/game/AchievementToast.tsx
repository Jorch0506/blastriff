"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { AchievementDef } from "@/lib/achievements";

interface AchievementToastProps {
  achievement: AchievementDef;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-xl border border-gold bg-surface-elevated p-4 shadow-lg"
    >
      <span className="text-3xl">{achievement.icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">Achievement unlocked</p>
        <p className="font-metal text-sm text-text">{achievement.name}</p>
        <p className="text-xs text-text-muted">{achievement.description}</p>
        <p className="text-xs font-semibold text-gold">+{achievement.trvePointsReward} TRVE POINTS bonus</p>
      </div>
    </motion.div>
  );
}
