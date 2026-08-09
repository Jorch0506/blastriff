"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE } from "@/lib/referral";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function SetReferralCookie({ username }: { username: string }) {
  useEffect(() => {
    document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(username)}; path=/; max-age=${THIRTY_DAYS_SECONDS}`;
  }, [username]);

  return null;
}
