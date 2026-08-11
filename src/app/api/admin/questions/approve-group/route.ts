import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale, QuestionDifficulty } from "@/types/database";

type Body = {
  genre: string;
  difficulty: QuestionDifficulty;
  language: Locale;
};

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const body = (await request.json()) as Partial<Body>;
  if (!body.genre || !body.difficulty || !body.language) {
    return NextResponse.json({ error: "Missing genre, difficulty, or language" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: pendingRows, error: fetchError } = await db
    .from("questions_pending_review")
    .select("*")
    .eq("genre", body.genre)
    .eq("difficulty", body.difficulty)
    .eq("language", body.language)
    .eq("fact_check_verdict", "VERIFIED_CORRECT")
    .in("status", ["pending", "needs_review"]);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ ok: true, approved: 0 });
  }

  const { error: insertError } = await db.from("questions").insert(
    pendingRows.map((pending) => ({
      question_text: pending.question_text,
      options: pending.options,
      correct_option: pending.correct_option,
      explanation: pending.explanation,
      difficulty: pending.difficulty,
      genre: pending.genre,
      question_type: pending.question_type,
      tags: pending.tags,
      language: pending.language,
      related_band: pending.related_band,
      related_album: pending.related_album,
      related_song: pending.related_song,
      related_year: pending.related_year,
      verified: true,
      ai_generated: pending.ai_generated,
    }))
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await db
    .from("questions_pending_review")
    .update({ status: "approved", reviewed_by: admin.userId, reviewed_at: new Date().toISOString() })
    .in(
      "id",
      pendingRows.map((pending) => pending.id)
    );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, approved: pendingRows.length });
}
