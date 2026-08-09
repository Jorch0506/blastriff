import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const supabase = createClient();

  const { data: entries, error } = await supabase
    .from("leaderboard_view")
    .select("id, username, display_name, avatar_url, country_code, trve_points, level, current_streak, rank")
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Could not load leaderboard" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser = null;
  if (user) {
    const { data: currentUserEntry } = await supabase
      .from("leaderboard_view")
      .select("id, username, display_name, avatar_url, country_code, trve_points, level, current_streak, rank")
      .eq("id", user.id)
      .maybeSingle();

    currentUser = currentUserEntry ?? null;
  }

  return NextResponse.json(
    { entries: entries ?? [], currentUser },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
  );
}
