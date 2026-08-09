import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevelName } from "@/lib/game/levels";
import { SetReferralCookie } from "@/components/referral/SetReferralCookie";

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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12 text-center">
      <SetReferralCookie username={referrer.username} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(204,0,0,0.15),_transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6">
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
  );
}
