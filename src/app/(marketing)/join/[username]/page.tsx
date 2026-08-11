import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevelName } from "@/lib/game/levels";
import { SetReferralCookie } from "@/components/referral/SetReferralCookie";
import { Footer } from "@/components/layout/Footer";

export default async function JoinPage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: referrer } = await supabase
    .from("profiles")
    .select("username, avatar_url, level, trve_points, total_questions_answered, total_correct")
    .eq("username", params.username)
    .maybeSingle();

  if (!referrer) {
    notFound();
  }

  const correctRate =
    referrer.total_questions_answered > 0
      ? Math.round((referrer.total_correct / referrer.total_questions_answered) * 100)
      : 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SetReferralCookie username={referrer.username} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(204,0,0,0.15),_transparent_60%)]" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated text-4xl">
          {referrer.avatar_url || referrer.username.charAt(0).toUpperCase()}
        </div>

        <h1 className="max-w-sm font-metal text-3xl text-text">{referrer.username} invited you to Blast Riff</h1>

        <div className="flex gap-6 rounded-xl border border-border bg-surface px-6 py-5">
          <div>
            <p className="font-metal text-xl text-gold">{referrer.level}</p>
            <p className="text-xs text-text-muted">{getLevelName(referrer.level)}</p>
          </div>
          <div>
            <p className="font-metal text-xl text-gold">{referrer.trve_points.toLocaleString()}</p>
            <p className="text-xs text-text-muted">TRVE Points</p>
          </div>
          <div>
            <p className="font-metal text-xl text-gold">{correctRate}%</p>
            <p className="text-xs text-text-muted">Correct rate</p>
          </div>
        </div>

        <p className="max-w-sm text-text-muted">
          Join the pit and both get 3 days of TRVE PASS when you complete your first game.
        </p>

        <Link
          href="/login"
          className="rounded-lg bg-primary px-10 py-4 font-metal text-xl tracking-wide text-text transition-colors hover:bg-primary-hover"
        >
          JOIN THE HORDE
        </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
