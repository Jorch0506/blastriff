"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/play", label: "Play", emoji: "⚡", comingSoon: false },
  { href: "/leaderboard", label: "Ranks", emoji: "🏆", comingSoon: false },
  { href: "/challenges", label: "Battles", emoji: "⚔️", comingSoon: true },
  { href: "/lore", label: "Lore", emoji: "📖", comingSoon: true },
  { href: "/profile", label: "Profile", emoji: "👤", comingSoon: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const isActive = pathname?.startsWith(tab.href) ?? false;

        if (tab.comingSoon) {
          return (
            <span
              key={tab.href}
              title="Coming soon"
              className="flex flex-1 cursor-not-allowed flex-col items-center gap-1 py-2 text-xs font-semibold text-text-muted opacity-50"
            >
              <span className="text-lg">{tab.emoji}</span>
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold",
              isActive ? "text-primary" : "text-text-muted"
            )}
          >
            {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
            <span className="text-lg">{tab.emoji}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
