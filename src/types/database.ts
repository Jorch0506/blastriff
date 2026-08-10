export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionType = "multiple_choice" | "true_false" | "audio" | "image";

export type UserRole = "user" | "moderator" | "admin";

export type Locale = "en" | "es";

export type FactCheckVerdict = "VERIFIED_CORRECT" | "VERIFIED_INCORRECT" | "UNCERTAIN";

export type PendingQuestionStatus = "pending" | "needs_review" | "approved" | "rejected";

export type GameMode = "solo" | "challenge" | "tournament" | "daily";

export type ChallengeStatus = "pending" | "active" | "completed" | "expired" | "declined";

export type TournamentStatus = "upcoming" | "active" | "completed" | "cancelled";

export type QuestionOption = {
  id: string;
  text: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  preferred_genres: string[];
  preferred_locale: Locale;
  trve_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_played_at: string | null;
  total_questions_answered: number;
  total_correct: number;
  is_premium: boolean;
  premium_expires_at: string | null;
  stripe_customer_id: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  genre: string;
  question_type: QuestionType;
  tags: string[];
  language: string;
  related_band: string | null;
  related_album: string | null;
  related_song: string | null;
  related_year: number | null;
  youtube_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  source_url: string | null;
  verified: boolean;
  ai_generated: boolean;
  confidence_score: number | null;
  play_count: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
};

export type GameSessionQuestion = {
  question_id: string;
  selected_option: string | null;
  correct: boolean;
  time_ms: number;
};

export type GameSession = {
  id: string;
  user_id: string;
  mode: GameMode;
  genre: string | null;
  questions_data: GameSessionQuestion[];
  total_questions: number;
  correct_answers: number;
  score: number;
  trve_points_earned: number;
  max_streak: number;
  duration_seconds: number;
  completed_at: string | null;
};

export type ChallengeQuestionSnapshot = {
  id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  difficulty: QuestionDifficulty;
  genre: string;
  question_type: QuestionType;
};

export type ChallengeQuestionPublic = Omit<ChallengeQuestionSnapshot, "correct_option">;

export type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string | null;
  genre: string;
  difficulty: QuestionDifficulty;
  questions_data: ChallengeQuestionSnapshot[];
  challenger_score: number | null;
  challenger_correct: number | null;
  challenger_time_seconds: number | null;
  challenger_completed_at: string | null;
  challenged_score: number | null;
  challenged_correct: number | null;
  challenged_time_seconds: number | null;
  challenged_completed_at: string | null;
  points_at_stake: number;
  winner_id: string | null;
  status: ChallengeStatus;
  share_token: string;
  expires_at: string;
  created_at: string;
};

export type PendingQuestion = {
  id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  genre: string;
  question_type: QuestionType;
  tags: string[];
  language: Locale;
  related_band: string | null;
  related_album: string | null;
  related_song: string | null;
  related_year: number | null;
  ai_generated: boolean;
  generation_model: string;
  generation_batch_id: string;
  fact_check_model: string | null;
  fact_check_verdict: FactCheckVerdict | null;
  fact_check_notes: string | null;
  status: PendingQuestionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type Achievement = {
  id: string;
  user_id: string;
  achievement_key: string;
  achievement_data: Record<string, unknown>;
  trve_points_reward: number;
  earned_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  genre: string | null;
  entry_fee_cents: number;
  prize_pool_cents: number;
  max_participants: number;
  current_participants: number;
  status: TournamentStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type NotificationType = "challenge_received" | "challenge_result" | "achievement_unlocked" | "level_up";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_given: boolean;
  created_at: string;
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  trve_points: number;
  level: number;
  current_streak: number;
  rank: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; username: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      questions: {
        Row: Question;
        Insert: Partial<Question> & {
          question_text: string;
          options: QuestionOption[];
          correct_option: string;
          difficulty: QuestionDifficulty;
          genre: string;
        };
        Update: Partial<Question>;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSession;
        Insert: Partial<GameSession> & { user_id: string; mode: GameMode };
        Update: Partial<GameSession>;
        Relationships: [];
      };
      challenges: {
        Row: Challenge;
        Insert: Partial<Challenge> & { challenger_id: string; genre: string; difficulty: QuestionDifficulty };
        Update: Partial<Challenge>;
        Relationships: [];
      };
      achievements: {
        Row: Achievement;
        Insert: Partial<Achievement> & { user_id: string; achievement_key: string };
        Update: Partial<Achievement>;
        Relationships: [];
      };
      questions_pending_review: {
        Row: PendingQuestion;
        Insert: Partial<PendingQuestion> & {
          question_text: string;
          options: QuestionOption[];
          correct_option: string;
          difficulty: QuestionDifficulty;
          genre: string;
          generation_model: string;
          generation_batch_id: string;
        };
        Update: Partial<PendingQuestion>;
        Relationships: [];
      };
      tournaments: {
        Row: Tournament;
        Insert: Partial<Tournament> & { name: string };
        Update: Partial<Tournament>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; type: NotificationType; title: string; body: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      referrals: {
        Row: Referral;
        Insert: Partial<Referral> & { referrer_id: string; referred_id: string };
        Update: Partial<Referral>;
        Relationships: [];
      };
    };
    Views: {
      leaderboard_view: {
        Row: LeaderboardEntry;
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
