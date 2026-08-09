"use client";

import { useEffect, useRef, useState } from "react";

interface TimerProps {
  duration?: number;
  onExpire: () => void;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Timer({ duration = 30, onExpire }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setSecondsLeft(duration);
    const interval = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const color = secondsLeft > 14 ? "#00C853" : secondsLeft > 7 ? "#FF6D00" : "#FF1744";
  const progress = secondsLeft / duration;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#2A2A2A" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s linear" }}
        />
      </svg>
      <span className="absolute font-metal text-xl" style={{ color }}>
        {secondsLeft}
      </span>
    </div>
  );
}
