import { createClient } from "@/lib/supabase/server";

export type AdminCheckResult = { ok: true; userId: string } | { ok: false; status: 401 | 403 };

function isAllowlistedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

// Admin access is `profiles.role === 'admin'` first (set once via migration
// or by another admin), with an ADMIN_EMAILS env var as a fallback so the
// panel is reachable even before that role is set on a given account.
export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401 };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role === "admin" || isAllowlistedEmail(user.email)) {
    return { ok: true, userId: user.id };
  }

  return { ok: false, status: 403 };
}
