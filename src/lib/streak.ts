import { differenceInCalendarDays } from "date-fns";

export type StreakResult = {
  newStreak: number;
  streakBroken: boolean;
  isFirstPlay: boolean;
};

export function calculateStreak(lastPlayedAt: Date | null, currentStreak: number): StreakResult {
  if (!lastPlayedAt) {
    return { newStreak: 1, streakBroken: false, isFirstPlay: true };
  }

  const diffDays = differenceInCalendarDays(new Date(), lastPlayedAt);

  if (diffDays === 0) {
    return { newStreak: currentStreak || 1, streakBroken: false, isFirstPlay: false };
  }

  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, streakBroken: false, isFirstPlay: false };
  }

  return { newStreak: 1, streakBroken: true, isFirstPlay: false };
}
