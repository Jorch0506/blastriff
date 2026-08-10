import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirect } from "@/lib/utils";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.username.startsWith("metalhead_")) {
    redirect("/dashboard");
  }

  return <OnboardingFlow userId={user.id} redirectTo={sanitizeRedirect(searchParams.redirectTo, "/dashboard")} />;
}
