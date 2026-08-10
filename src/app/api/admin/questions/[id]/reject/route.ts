import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ reason: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const reason = parsed.success ? parsed.data.reason ?? null : null;

  const db = createAdminClient();

  const { data: existing, error: fetchError } = await db
    .from("questions_pending_review")
    .select("status")
    .eq("id", params.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "pending" && existing.status !== "needs_review") {
    return NextResponse.json({ error: "Question already reviewed" }, { status: 400 });
  }

  const { error: updateError } = await db
    .from("questions_pending_review")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
