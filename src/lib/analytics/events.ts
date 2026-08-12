export type AnalyticsEvents = {
  user_registered: { method: "google" | "apple" | "email" };
  onboarding_completed: Record<string, never>;
  game_started: { mode: string; genre: string; difficulty?: string };
  game_completed: { score: number; trve_points_earned: number; genre: string; mode: string };
  level_up: { from_level: number; to_level: number };
  challenge_sent: { genre: string; difficulty: string; points_at_stake: number };
  challenge_completed: {
    genre: string;
    difficulty: string;
    won: boolean;
    is_draw: boolean;
    points_won: number;
  };
  premium_cta_clicked: { location: "header" | "bottomnav" | "dashboard" };
  premium_checkout_started: { plan: string };
  premium_subscribed: { plan: string };
  streak_broken: { previous_streak: number };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
