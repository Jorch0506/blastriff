import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, Database, GameSessionQuestion, Profile } from "@/types/database";

export type AchievementKey =
  | "first_blood"
  | "first_game"
  | "perfect_game"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "headbanger"
  | "metalhead"
  | "thrash_fan"
  | "speed_demon";

export type AchievementDef = {
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
  trvePointsReward: number;
};

export const ACHIEVEMENTS: Record<AchievementKey, AchievementDef> = {
  first_blood: {
    key: "first_blood",
    name: "FIRST BLOOD",
    description: "Answer your first question correctly",
    icon: "🩸",
    trvePointsReward: 25,
  },
  first_game: {
    key: "first_game",
    name: "INITIATED",
    description: "Complete your first game session",
    icon: "🤘",
    trvePointsReward: 25,
  },
  perfect_game: {
    key: "perfect_game",
    name: "FLAWLESS ASSAULT",
    description: "Get a perfect score in a 10-question session",
    icon: "💯",
    trvePointsReward: 100,
  },
  streak_3: {
    key: "streak_3",
    name: "WARMING UP",
    description: "Reach a 3-day streak",
    icon: "🥉",
    trvePointsReward: 50,
  },
  streak_7: {
    key: "streak_7",
    name: "ON FIRE",
    description: "Reach a 7-day streak",
    icon: "🥈",
    trvePointsReward: 150,
  },
  streak_30: {
    key: "streak_30",
    name: "TRVE DEDICATION",
    description: "Reach a 30-day streak",
    icon: "🥇",
    trvePointsReward: 500,
  },
  headbanger: {
    key: "headbanger",
    name: "HEADBANGER",
    description: "Reach 500 TRVE POINTS",
    icon: "🎸",
    trvePointsReward: 50,
  },
  metalhead: {
    key: "metalhead",
    name: "METALHEAD",
    description: "Reach 2,000 TRVE POINTS",
    icon: "⚡",
    trvePointsReward: 100,
  },
  thrash_fan: {
    key: "thrash_fan",
    name: "THRASH FAN",
    description: "Answer 10 Thrash Metal questions correctly",
    icon: "⚔️",
    trvePointsReward: 75,
  },
  speed_demon: {
    key: "speed_demon",
    name: "SPEED DEMON",
    description: "Answer correctly in under 3 seconds",
    icon: "💨",
    trvePointsReward: 50,
  },
};

export type AchievementSessionData = {
  genre: string;
  correctAnswers: number;
  totalQuestions: number;
  questionsData: GameSessionQuestion[];
  previousTotalCorrect: number;
  previousTotalQuestionsAnswered: number;
  previousTrvePoints: number;
  previousDailyStreak: number;
};

export async function checkAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionData: AchievementSessionData,
  profile: Profile
): Promise<Achievement[]> {
  const unlocked = new Set<AchievementKey>();

  if (sessionData.previousTotalCorrect === 0 && sessionData.correctAnswers > 0) {
    unlocked.add("first_blood");
  }

  if (sessionData.previousTotalQuestionsAnswered === 0 && sessionData.totalQuestions > 0) {
    unlocked.add("first_game");
  }

  if (sessionData.totalQuestions === 10 && sessionData.correctAnswers === 10) {
    unlocked.add("perfect_game");
  }

  if (profile.current_streak >= 3 && sessionData.previousDailyStreak < 3) {
    unlocked.add("streak_3");
  }
  if (profile.current_streak >= 7 && sessionData.previousDailyStreak < 7) {
    unlocked.add("streak_7");
  }
  if (profile.current_streak >= 30 && sessionData.previousDailyStreak < 30) {
    unlocked.add("streak_30");
  }

  if (profile.trve_points >= 500 && sessionData.previousTrvePoints < 500) {
    unlocked.add("headbanger");
  }
  if (profile.trve_points >= 2000 && sessionData.previousTrvePoints < 2000) {
    unlocked.add("metalhead");
  }

  if (sessionData.questionsData.some((question) => question.correct && question.time_ms < 3000)) {
    unlocked.add("speed_demon");
  }

  if (sessionData.genre === "thrash") {
    const { data: thrashSessions } = await supabase
      .from("game_sessions")
      .select("correct_answers")
      .eq("user_id", userId)
      .eq("genre", "thrash");

    const totalThrashCorrect = (thrashSessions ?? []).reduce(
      (sum, row) => sum + (row.correct_answers ?? 0),
      0
    );
    if (totalThrashCorrect >= 10) {
      unlocked.add("thrash_fan");
    }
  }

  if (unlocked.size === 0) return [];

  const rows = Array.from(unlocked).map((key) => ({
    user_id: userId,
    achievement_key: key,
    achievement_data: {},
    trve_points_reward: ACHIEVEMENTS[key].trvePointsReward,
  }));

  const { data: inserted } = await supabase
    .from("achievements")
    .upsert(rows, { onConflict: "user_id,achievement_key", ignoreDuplicates: true })
    .select("*");

  return inserted ?? [];
}
