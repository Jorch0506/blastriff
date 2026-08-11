import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  theme: z.enum(["frost", "venom", "ash"]).nullable(),
});

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  if (!profile?.is_premium) {
    return NextResponse.json({ error: "TRVE PASS required to change your profile accent" }, { status: 403 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profile_theme: parsed.data.theme })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save theme" }, { status: 500 });
  }

  return NextResponse.json({ theme: parsed.data.theme });
}
