"use client";

import { motion } from "framer-motion";

interface FloatingPointsProps {
  amount: number;
}

export function FloatingPoints({ amount }: FloatingPointsProps) {
  return (
    <motion.span
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -40, opacity: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="pointer-events-none absolute left-full top-0 ml-2 whitespace-nowrap text-sm font-bold text-gold"
    >
      +{amount} TP
    </motion.span>
  );
}
