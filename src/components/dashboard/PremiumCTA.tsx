"use client";

import { track } from "@/lib/analytics/client";

export function PremiumCTA() {
  return (
    <a
      href="/api/billing/checkout"
      onClick={() => track("premium_cta_clicked", { location: "dashboard" })}
      className="flex items-center justify-between rounded-xl border border-gold bg-gold/10 px-5 py-4 text-gold transition-colors hover:bg-gold/20"
    >
      <span className="font-metal text-lg tracking-wide">⚡ GET TRVE PASS</span>
      <span className="text-xs font-bold uppercase tracking-wide">Unlock bonus points</span>
    </a>
  );
}
