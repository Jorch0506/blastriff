import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getShareUrl } from "@/lib/challenges";

type ProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: pendingRows }, { data: mineRows }] = await Promise.all([
    supabase
      .from("challenges")
      .select(
        "id, challenger_id, genre, difficulty, points_at_stake, status, share_token, expires_at, created_at"
      )
      .eq("challenged_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("challenges")
      .select(
        "id, challenged_id, genre, difficulty, points_at_stake, status, share_token, winner_id, challenger_score, challenged_score, expires_at, created_at"
      )
      .eq("challenger_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const otherIds = new Set<string>();
  (pendingRows ?? []).forEach((row) => otherIds.add(row.challenger_id));
  (mineRows ?? []).forEach((row) => {
    if (row.challenged_id) otherIds.add(row.challenged_id);
  });

  const { data: profiles } = otherIds.size
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", Array.from(otherIds))
    : { data: [] as ProfileSummary[] };

  const profileMap = new Map((profiles ?? []).map((profile: ProfileSummary) => [profile.id, profile]));

  const pending = (pendingRows ?? []).map((row) => ({
    id: row.id,
    shareToken: row.share_token,
    genre: row.genre,
    difficulty: row.difficulty,
    pointsAtStake: row.points_at_stake,
    shareUrl: getShareUrl(row.share_token),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    challenger: profileMap.get(row.challenger_id) ?? null,
  }));

  const mine = (mineRows ?? []).map((row) => ({
    id: row.id,
    shareToken: row.share_token,
    genre: row.genre,
    difficulty: row.difficulty,
    pointsAtStake: row.points_at_stake,
    status: row.status,
    shareUrl: getShareUrl(row.share_token),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    challengerScore: row.challenger_score,
    challengedScore: row.challenged_score,
    won: row.winner_id === user.id,
    isDraw: row.status === "completed" && row.winner_id === null,
    challenged: row.challenged_id ? (profileMap.get(row.challenged_id) ?? null) : null,
  }));

  return NextResponse.json({ pending, mine });
}
