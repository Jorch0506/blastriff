import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LEVEL_NAMES = ["POSEUR", "HEADBANGER", "METALHEAD", "CULT MEMBER", "TRVE KVLT", "BLAST RIFF"];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const levelName = LEVEL_NAMES[(profile?.level ?? 1) - 1] ?? LEVEL_NAMES[0];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <h1 className="font-metal text-3xl text-text sm:text-4xl">
        WELCOME TO BLAST RIFF, {profile?.username ?? "METALHEAD"}
      </h1>
      <p className="text-gold tracking-widest">
        LEVEL {profile?.level ?? 1} · {levelName}
      </p>
      <Link
        href="/play"
        className="rounded-lg bg-primary px-8 py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover"
      >
        PLAY NOW
      </Link>
    </main>
  );
}
