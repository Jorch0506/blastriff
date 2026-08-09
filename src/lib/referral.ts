export const REFERRAL_COOKIE = "br_referrer";
export const REFERRAL_PREMIUM_DAYS = 3;

export function getJoinUrl(username: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.blastriff.com";
  return `${base.replace(/\/$/, "")}/join/${username}`;
}
