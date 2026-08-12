import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreChallengeAnswers } from "@/lib/challenges";
import { notifyUser } from "@/lib/notifications";
import { getLevelFromPoints } from "@/lib/game/levels";
import { trackServer } from "@/lib/analytics/server";

const answerSchema = z.object({
  questionId: z.string(),
  selectedOption: z.string().nullable(),
  timeMs: z.number().min(0),
});

const bodySchema = z.object({
  answers: z.array(answerSchema).min(1).max(50),
});

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: challenge, error } = await admin
    .from("challenges")
    .select("*")
    .eq("share_token", params.token)
    .maybeSingle();

  if (error || !challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (challenge.status === "completed" || challenge.status === "declined") {
    return NextResponse.json({ error: "This challenge is no longer open" }, { status: 400 });
  }

  const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
  if (isExpired || challenge.status === "expired") {
    if (challenge.status !== "expired") {
      await admin.from("challenges").update({ status: "expired" }).eq("id", challenge.id);
    }
    return NextResponse.json({ error: "This challenge has expired" }, { status: 400 });
  }

  const { score, correct, totalTimeMs } = scoreChallengeAnswers(challenge.questions_data, parsed.data.answers);
  const timeSeconds = Math.round(totalTimeMs / 1000);

  const isChallenger = user.id === challenge.challenger_id;

  if (isChallenger) {
    if (challenge.challenger_completed_at !== null) {
      return NextResponse.json({ error: "You already played this challenge" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("challenges")
      .update({
        challenger_score: score,
        challenger_correct: correct,
        challenger_time_seconds: timeSeconds,
        challenger_completed_at: new Date().toISOString(),
      })
      .eq("id", challenge.id);

    if (updateError) {
      return NextResponse.json({ error: "Could not save your result" }, { status: 500 });
    }

    return NextResponse.json({ role: "challenger", score, correct, total: challenge.questions_data.length });
  }

  // Challenged side
  if (challenge.challenger_completed_at === null) {
    return NextResponse.json({ error: "The challenger hasn't played yet" }, { status: 400 });
  }
  if (challenge.challenged_id !== null && challenge.challenged_id !== user.id) {
    return NextResponse.json({ error: "This challenge has already been claimed" }, { status: 403 });
  }
  if (challenge.challenged_completed_at !== null) {
    return NextResponse.json({ error: "You already played this challenge" }, { status: 400 });
  }

  const challengerScore = challenge.challenger_score ?? 0;
  const challengerTime = challenge.challenger_time_seconds ?? 0;

  let winnerId: string | null;
  if (score > challengerScore) {
    winnerId = user.id;
  } else if (score < challengerScore) {
    winnerId = challenge.challenger_id;
  } else if (timeSeconds < challengerTime) {
    winnerId = user.id;
  } else if (timeSeconds > challengerTime) {
    winnerId = challenge.challenger_id;
  } else {
    winnerId = null;
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, trve_points, level")
    .in("id", [challenge.challenger_id, user.id]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const challengerPoints = profileMap.get(challenge.challenger_id)?.trve_points ?? 0;
  const challengedPoints = profileMap.get(user.id)?.trve_points ?? 0;
  const preChallengerLevel = profileMap.get(challenge.challenger_id)?.level ?? 1;
  const preChallengedLevel = profileMap.get(user.id)?.level ?? 1;

  let newChallengerPoints = challengerPoints;
  let newChallengedPoints = challengedPoints;

  if (winnerId === user.id) {
    newChallengedPoints = challengedPoints + challenge.points_at_stake;
    newChallengerPoints = Math.max(0, challengerPoints - challenge.points_at_stake);
  } else if (winnerId === challenge.challenger_id) {
    newChallengerPoints = challengerPoints + challenge.points_at_stake;
    newChallengedPoints = Math.max(0, challengedPoints - challenge.points_at_stake);
  }

  const newChallengerLevel = getLevelFromPoints(newChallengerPoints);
  const newChallengedLevel = getLevelFromPoints(newChallengedPoints);

  await Promise.all([
    admin
      .from("profiles")
      .update({ trve_points: newChallengerPoints, level: newChallengerLevel })
      .eq("id", challenge.challenger_id),
    admin
      .from("profiles")
      .update({ trve_points: newChallengedPoints, level: newChallengedLevel })
      .eq("id", user.id),
  ]);

  if (newChallengerLevel > preChallengerLevel) {
    trackServer(challenge.challenger_id, "level_up", {
      from_level: preChallengerLevel,
      to_level: newChallengerLevel,
    });
  }
  if (newChallengedLevel > preChallengedLevel) {
    trackServer(user.id, "level_up", { from_level: preChallengedLevel, to_level: newChallengedLevel });
  }

  const { error: updateError } = await admin
    .from("challenges")
    .update({
      challenged_id: user.id,
      challenged_score: score,
      challenged_correct: correct,
      challenged_time_seconds: timeSeconds,
      challenged_completed_at: new Date().toISOString(),
      winner_id: winnerId,
      status: "completed",
    })
    .eq("id", challenge.id);

  if (updateError) {
    return NextResponse.json({ error: "Could not save your result" }, { status: 500 });
  }

  const { data: challengedProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const won = winnerId === user.id;
  const isDraw = winnerId === null;
  const pointsWon = isDraw ? 0 : won ? challenge.points_at_stake : -challenge.points_at_stake;

  trackServer(user.id, "challenge_completed", {
    genre: challenge.genre,
    difficulty: challenge.difficulty,
    won,
    is_draw: isDraw,
    points_won: pointsWon,
  });
  trackServer(challenge.challenger_id, "challenge_completed", {
    genre: challenge.genre,
    difficulty: challenge.difficulty,
    won: winnerId === challenge.challenger_id,
    is_draw: isDraw,
    points_won: isDraw ? 0 : winnerId === challenge.challenger_id ? challenge.points_at_stake : -challenge.points_at_stake,
  });

  await notifyUser(
    admin,
    challenge.challenger_id,
    "challenge_result",
    won ? "⚔️ Your challenge was defeated" : winnerId === null ? "⚔️ Your challenge ended in a draw" : "⚔️ You won your challenge!",
    `${challengedProfile?.username ?? "A metalhead"} scored ${score} TP against your ${challengerScore} TP in ${challenge.genre}.`,
    { challengeId: challenge.id, shareToken: params.token, won: !won }
  );

  return NextResponse.json({
    won,
    score,
    correct,
    challengerScore,
    pointsWon,
    newTotalPoints: newChallengedPoints,
  });
}
