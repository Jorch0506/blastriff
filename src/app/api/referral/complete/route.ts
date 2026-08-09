import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_COOKIE, REFERRAL_PREMIUM_DAYS } from "@/lib/referral";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = cookies();
  const referrerUsername = cookieStore.get(REFERRAL_COOKIE)?.value;

  if (!referrerUsername) {
    return NextResponse.json({ rewardGiven: false, referrerUsername: null });
  }

  const admin = createAdminClient();

  const { data: existingReferral } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existingReferral) {
    return NextResponse.json({ rewardGiven: false, referrerUsername: null });
  }

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, username, premium_expires_at")
    .eq("username", referrerUsername)
    .maybeSingle();

  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ rewardGiven: false, referrerUsername: null });
  }

  const { data: referred } = await admin
    .from("profiles")
    .select("premium_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  function extendExpiry(current: string | null): string {
    const currentDate = current ? new Date(current) : null;
    const base = currentDate && currentDate.getTime() > Date.now() ? currentDate : new Date();
    base.setDate(base.getDate() + REFERRAL_PREMIUM_DAYS);
    return base.toISOString();
  }

  await Promise.all([
    admin
      .from("profiles")
      .update({ is_premium: true, premium_expires_at: extendExpiry(referrer.premium_expires_at) })
      .eq("id", referrer.id),
    admin
      .from("profiles")
      .update({ is_premium: true, premium_expires_at: extendExpiry(referred?.premium_expires_at ?? null) })
      .eq("id", user.id),
    admin.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      reward_given: true,
    }),
  ]);

  const response = NextResponse.json({ rewardGiven: true, referrerUsername: referrer.username });
  response.cookies.delete(REFERRAL_COOKIE);
  return response;
}
