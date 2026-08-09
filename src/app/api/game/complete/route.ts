import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculatePoints } from "@/lib/game/scoring";
import { getLevelFromPoints, getLevelName } from "@/lib/game/levels";
import { calculateStreak } from "@/lib/streak";
import { checkAchievements } from "@/lib/achievements";
import type { GameMode, GameSessionQuestion, QuestionDifficulty } from "@/types/database";

const answerSchema = z.object({
  questionId: z.string(),
  selected: z.string().nullable(),
  timeMs: z.number().min(0),
});

const bodySchema = z.object({
  mode: z.enum(["gauntlet", "daily", "practice"]),
  genre: z.string(),
  answers: z.array(answerSchema).min(1).max(50),
  durationSeconds: z.number().min(0),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { mode, genre, answers, durationSeconds } = parsed.data;

  if (mode === "practice") {
    return NextResponse.json({ sessionId: null, levelUp: false, newLevel: null, newLevelName: null });
  }

  const questionIds = answers.map((answer) => answer.questionId);
  const { data: questionRows, error: questionsError } = await supabase
    .from("questions")
    .select("id, difficulty, correct_option")
    .in("id", questionIds);

  if (questionsError || !questionRows) {
    return NextResponse.json({ error: "Could not verify questions" }, { status: 500 });
  }

  const questionMap = new Map(questionRows.map((row) => [row.id, row]));

  let streak = 0;
  let maxStreak = 0;
  let trvePointsEarned = 0;
  let correctAnswers = 0;
  const questionsData: GameSessionQuestion[] = [];

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const correct = answer.selected !== null && answer.selected === question.correct_option;
    streak = correct ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
    if (correct) correctAnswers += 1;

    const points = calculatePoints({
      difficulty: question.difficulty as QuestionDifficulty,
      timeMs: answer.timeMs,
      correct,
      streakAfterAnswer: streak,
    });
    trvePointsEarned += points;

    questionsData.push({
      question_id: answer.questionId,
      selected_option: answer.selected,
      correct,
      time_ms: answer.timeMs,
    });
  }

  const dbMode: GameMode = mode === "gauntlet" ? "solo" : "daily";

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      user_id: user.id,
      mode: dbMode,
      genre,
      questions_data: questionsData,
      total_questions: questionsData.length,
      correct_answers: correctAnswers,
      score: trvePointsEarned,
      trve_points_earned: trvePointsEarned,
      max_streak: maxStreak,
      duration_seconds: durationSeconds,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Could not save session" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "trve_points, level, total_questions_answered, total_correct, current_streak, longest_streak, last_played_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ sessionId: session.id, levelUp: false, newLevel: null, newLevelName: null });
  }

  const now = new Date();
  const lastPlayed = profile.last_played_at ? new Date(profile.last_played_at) : null;
  const previousDailyStreak = profile.current_streak;
  const { newStreak: newDailyStreak } = calculateStreak(lastPlayed, profile.current_streak);

  const newTotalPoints = profile.trve_points + trvePointsEarned;
  const newLevel = getLevelFromPoints(newTotalPoints);
  const levelUp = newLevel > profile.level;

  const { data: updatedProfile } = await supabase
    .from("profiles")
    .update({
      trve_points: newTotalPoints,
      level: newLevel,
      total_questions_answered: profile.total_questions_answered + questionsData.length,
      total_correct: profile.total_correct + correctAnswers,
      current_streak: newDailyStreak,
      longest_streak: Math.max(profile.longest_streak, newDailyStreak),
      last_played_at: now.toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();

  let newAchievements: Awaited<ReturnType<typeof checkAchievements>> = [];

  if (updatedProfile) {
    newAchievements = await checkAchievements(
      supabase,
      user.id,
      {
        genre,
        correctAnswers,
        totalQuestions: questionsData.length,
        questionsData,
        previousTotalCorrect: profile.total_correct,
        previousTotalQuestionsAnswered: profile.total_questions_answered,
        previousTrvePoints: profile.trve_points,
        previousDailyStreak,
      },
      updatedProfile
    );

    const bonusPoints = newAchievements.reduce((sum, achievement) => sum + achievement.trve_points_reward, 0);
    if (bonusPoints > 0) {
      await supabase
        .from("profiles")
        .update({
          trve_points: updatedProfile.trve_points + bonusPoints,
          level: getLevelFromPoints(updatedProfile.trve_points + bonusPoints),
        })
        .eq("id", user.id);
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    levelUp,
    newLevel: levelUp ? newLevel : null,
    newLevelName: levelUp ? getLevelName(newLevel) : null,
    newAchievements: newAchievements.map((achievement) => ({
      key: achievement.achievement_key,
      trvePointsReward: achievement.trve_points_reward,
    })),
  });
}
