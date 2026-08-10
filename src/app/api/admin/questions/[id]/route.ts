import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const optionSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });

const patchSchema = z.object({
  question_text: z.string().min(1).optional(),
  options: z.array(optionSchema).optional(),
  correct_option: z.string().min(1).optional(),
  explanation: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: existing, error: fetchError } = await db
    .from("questions_pending_review")
    .select("status, options, correct_option")
    .eq("id", params.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "pending" && existing.status !== "needs_review") {
    return NextResponse.json({ error: "Only pending or needs_review questions can be edited" }, { status: 400 });
  }

  const nextOptions = parsed.data.options ?? existing.options;
  const nextCorrectOption = parsed.data.correct_option ?? existing.correct_option;
  if (!nextOptions.some((option) => option.id === nextCorrectOption)) {
    return NextResponse.json({ error: "correct_option must match one of the options" }, { status: 400 });
  }

  const { error: updateError } = await db
    .from("questions_pending_review")
    .update({
      ...parsed.data,
      options: nextOptions,
      correct_option: nextCorrectOption,
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
