import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminQuestionsPanel } from "@/components/admin/AdminQuestionsPanel";

function isAllowlistedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

export default async function AdminQuestionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin" && !isAllowlistedEmail(user.email)) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 pb-24">
      <h1 className="font-metal text-2xl text-text">QUESTION REVIEW</h1>
      <AdminQuestionsPanel />
    </main>
  );
}
