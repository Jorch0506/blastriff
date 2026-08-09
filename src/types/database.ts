export type QuestionDifficulty = "easy" | "medium" | "hard" | "expert";

export type QuestionType = "multiple_choice" | "true_false" | "audio" | "image";

export type UserRole = "user" | "moderator" | "admin";

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

export type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string | null;
  genre: string;
  difficulty: QuestionDifficulty;
  questions_data: GameSessionQuestion[];
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
      tournaments: {
        Row: Tournament;
        Insert: Partial<Tournament> & { name: string };
        Update: Partial<Tournament>;
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
