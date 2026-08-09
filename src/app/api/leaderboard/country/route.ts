import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = "id, username, display_name, avatar_url, country_code, trve_points, level, current_streak";
const RANK_POOL_SIZE = 500;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let countryCode = searchParams.get("code");
  if (!countryCode && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("country_code")
      .eq("id", user.id)
      .maybeSingle();
    countryCode = profile?.country_code ?? null;
  }

  if (!countryCode) {
    return NextResponse.json({ entries: [], currentUser: null, countryCode: null });
  }

  const { data: rows, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("country_code", countryCode)
    .gt("trve_points", 0)
    .order("trve_points", { ascending: false })
    .limit(RANK_POOL_SIZE);

  if (error) {
    return NextResponse.json({ error: "Could not load leaderboard" }, { status: 500 });
  }

  const ranked = (rows ?? []).map((row, index) => ({ ...row, rank: index + 1 }));
  const entries = ranked.slice(0, limit);
  const currentUser = user ? (ranked.find((row) => row.id === user.id) ?? null) : null;

  return NextResponse.json(
    { entries, currentUser, countryCode },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
  );
}
