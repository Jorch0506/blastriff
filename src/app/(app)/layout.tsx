import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppChrome } from "@/components/layout/AppChrome";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { count: pendingChallengeCount }] = await Promise.all([
    supabase.from("profiles").select("username, trve_points").eq("id", user.id).single(),
    supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("challenged_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppChrome
        username={profile?.username ?? "METALHEAD"}
        trvePoints={profile?.trve_points ?? 0}
        pendingChallengeCount={pendingChallengeCount ?? 0}
      >
        {children}
      </AppChrome>
    </div>
  );
}
