"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  username: string;
  trvePoints: number;
}

export function Header({ username, trvePoints }: HeaderProps) {
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
        <span className="cursor-not-allowed opacity-60" title="Coming soon">
          CHALLENGES
        </span>
      </nav>

      <div className="flex items-center gap-4">
        <span className="font-metal text-sm text-gold">{trvePoints.toLocaleString()} TP</span>
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
