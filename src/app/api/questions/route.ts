import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { difficultyFromNumber } from "@/lib/game/scoring";
import type { ClientQuestion } from "@/types/game";

const QUESTION_COLUMNS = "id, question_text, options, difficulty, genre, question_type";
const POOL_SIZE = 200;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`questions:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Slow down, poseur." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "all";
  const difficultyParam = searchParams.get("difficulty");
  const language = searchParams.get("language") ?? "en";

  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT) : DEFAULT_LIMIT;

  const supabase = createClient();
  let query = supabase
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("verified", true)
    .eq("language", language);

  if (genre !== "all") {
    query = query.eq("genre", genre);
  }

  if (difficultyParam !== null) {
    const numericDifficulty = Number(difficultyParam);
    if (Number.isFinite(numericDifficulty)) {
      query = query.eq("difficulty", difficultyFromNumber(numericDifficulty));
    }
  }

  const { data, error } = await query.limit(POOL_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pool = (data ?? []) as ClientQuestion[];
  const questions = shuffle(pool).slice(0, limit);

  return NextResponse.json({ questions });
}
