import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicQuestions } from "@/lib/challenges";

export const dynamic = "force-dynamic";

type ProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: challenge, error } = await admin
    .from("challenges")
    .select("*")
    .eq("share_token", params.token)
    .maybeSingle();

  if (error || !challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const isExpired = challenge.status === "pending" && new Date(challenge.expires_at).getTime() < Date.now();
  if (isExpired) {
    await admin.from("challenges").update({ status: "expired" }).eq("id", challenge.id);
  }
  const effectiveStatus = isExpired ? "expired" : challenge.status;

  const profileIds = [challenge.challenger_id, challenge.challenged_id].filter(
    (id): id is string => id !== null
  );
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", profileIds);

  const profileMap = new Map((profiles ?? []).map((profile: ProfileSummary) => [profile.id, profile]));
  const challengerProfile = profileMap.get(challenge.challenger_id);
  const challengedProfile = challenge.challenged_id ? profileMap.get(challenge.challenged_id) : undefined;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isChallenger = user?.id === challenge.challenger_id;
  const isChallenged = challenge.challenged_id !== null && user?.id === challenge.challenged_id;
  const challengerDone = challenge.challenger_completed_at !== null;
  const challengedDone = challenge.challenged_completed_at !== null;

  const canPlayAsChallenger = isChallenger && !challengerDone && !isExpired && effectiveStatus === "pending";
  const canPlayAsChallenged =
    !!user &&
    !isChallenger &&
    challengerDone &&
    !challengedDone &&
    !isExpired &&
    effectiveStatus === "pending" &&
    (challenge.challenged_id === null || isChallenged);

  const role = isChallenger ? "challenger" : isChallenged ? "challenged" : user ? "visitor" : "anonymous";

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      genre: challenge.genre,
      difficulty: challenge.difficulty,
      pointsAtStake: challenge.points_at_stake,
      status: effectiveStatus,
      expiresAt: challenge.expires_at,
      createdAt: challenge.created_at,
      winnerId: challenge.winner_id,
      questionCount: challenge.questions_data.length,
      challenger: challengerProfile
        ? {
            id: challengerProfile.id,
            username: challengerProfile.username,
            displayName: challengerProfile.display_name,
            avatarUrl: challengerProfile.avatar_url,
            score: challenge.challenger_score,
            correct: challenge.challenger_correct,
            timeSeconds: challenge.challenger_time_seconds,
            completedAt: challenge.challenger_completed_at,
          }
        : null,
      challenged: challengedProfile
        ? {
            id: challengedProfile.id,
            username: challengedProfile.username,
            displayName: challengedProfile.display_name,
            avatarUrl: challengedProfile.avatar_url,
            score: challenge.challenged_score,
            correct: challenge.challenged_correct,
            timeSeconds: challenge.challenged_time_seconds,
            completedAt: challenge.challenged_completed_at,
          }
        : null,
    },
    viewer: {
      isAuthenticated: !!user,
      role,
      canPlay: canPlayAsChallenger || canPlayAsChallenged,
      playingAs: canPlayAsChallenger ? "challenger" : canPlayAsChallenged ? "challenged" : null,
    },
    questions:
      canPlayAsChallenger || canPlayAsChallenged ? toPublicQuestions(challenge.questions_data) : undefined,
  });
}
