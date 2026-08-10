import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const db = createAdminClient();

  const { data: pending, error: fetchError } = await db
    .from("questions_pending_review")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !pending) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (pending.status !== "pending" && pending.status !== "needs_review") {
    return NextResponse.json({ error: "Question already reviewed" }, { status: 400 });
  }

  const { error: insertError } = await db.from("questions").insert({
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
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await db
    .from("questions_pending_review")
    .update({ status: "approved", reviewed_by: admin.userId, reviewed_at: new Date().toISOString() })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
