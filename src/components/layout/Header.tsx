"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { track } from "@/lib/analytics/client";

interface HeaderProps {
  username: string;
  trvePoints: number;
  pendingChallengeCount: number;
  isPremium: boolean;
}

export function Header({ username, trvePoints, pendingChallengeCount, isPremium }: HeaderProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:flex">
      <Link href="/dashboard" className="font-metal text-xl text-primary">
        BLAST⚡RIFF
      </Link>

      <nav className="flex items-center gap-6 text-sm font-semibold tracking-wide text-text-muted">
        <Link href="/play" className="transition-colors hover:text-text">
          PLAY
        </Link>
        <Link href="/leaderboard" className="transition-colors hover:text-text">
          LEADERBOARD
        </Link>
        <Link href="/challenges" className="relative transition-colors hover:text-text">
          CHALLENGES
          {pendingChallengeCount > 0 && (
            <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-text">
              {pendingChallengeCount > 9 ? "9+" : pendingChallengeCount}
            </span>
          )}
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {isPremium ? (
          <span className="rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs font-bold tracking-wide text-gold">
            🔥 TRVE KVLT ACTIVE
          </span>
        ) : (
          <a
            href="/api/billing/checkout"
            onClick={() => track("premium_cta_clicked", { location: "header" })}
            className="animate-pulse-gold rounded-full bg-gold px-3 py-1 text-xs font-bold tracking-wide text-background transition-colors hover:bg-gold-dim"
          >
            ⚡ GET TRVE PASS
          </a>
        )}
        <span className="font-metal text-sm text-gold">{trvePoints.toLocaleString()} TP</span>
        <NotificationBell />
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-sm font-bold text-text transition-colors hover:ring-2 hover:ring-primary"
        >
          {username.charAt(0).toUpperCase()}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="text-text-muted transition-colors hover:text-error"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
