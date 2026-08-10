import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { POINTS_AT_STAKE_OPTIONS, getShareUrl, toPublicQuestions } from "@/lib/challenges";
import type { ChallengeQuestionSnapshot } from "@/types/database";

const POOL_SIZE = 100;
const QUESTION_COUNT = 10;

const bodySchema = z.object({
  genre: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pointsAtStake: z.number().refine((value) => (POINTS_AT_STAKE_OPTIONS as readonly number[]).includes(value)),
});

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

  const { genre, difficulty, pointsAtStake } = parsed.data;

  const { data: challengerProfile } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", user.id)
    .single();
  const preferredLocale = challengerProfile?.preferred_locale ?? "en";

  let query = supabase
    .from("questions")
    .select("id, question_text, options, correct_option, difficulty, genre, question_type")
    .eq("verified", true)
    .eq("difficulty", difficulty)
    .eq("language", preferredLocale);

  if (genre !== "all") {
    query = query.eq("genre", genre);
  }

  const { data: pool, error: poolError } = await query.limit(POOL_SIZE);

  if (poolError) {
    return NextResponse.json({ error: "Could not load questions" }, { status: 500 });
  }

  if (!pool || pool.length < QUESTION_COUNT) {
    return NextResponse.json({ error: "Not enough questions available for this matchup" }, { status: 400 });
  }

  const questionsData = shuffle(pool).slice(0, QUESTION_COUNT) as ChallengeQuestionSnapshot[];

  const { data: challenge, error: insertError } = await supabase
    .from("challenges")
    .insert({
      challenger_id: user.id,
      genre,
      difficulty,
      questions_data: questionsData,
      points_at_stake: pointsAtStake,
    })
    .select("id, share_token")
    .single();

  if (insertError || !challenge) {
    return NextResponse.json({ error: "Could not create challenge" }, { status: 500 });
  }

  return NextResponse.json({
    challengeId: challenge.id,
    shareToken: challenge.share_token,
    shareUrl: getShareUrl(challenge.share_token),
    questions: toPublicQuestions(questionsData),
  });
}
