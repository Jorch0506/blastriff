import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirect } from "@/lib/utils";
import { trackServer } from "@/lib/analytics/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = sanitizeRedirect(searchParams.get("redirectTo"), "/dashboard");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .single();

      if (profile?.username?.startsWith("metalhead_")) {
        trackServer(data.user.id, "user_registered", { method: "google" });

        const onboardingUrl = new URL("/onboarding", origin);
        onboardingUrl.searchParams.set("redirectTo", redirectTo);
        return NextResponse.redirect(onboardingUrl);
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
