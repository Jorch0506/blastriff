"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface InviteSectionProps {
  joinUrl: string;
  referralCount: number;
}

export function InviteSection({ joinUrl, referralCount }: InviteSectionProps) {
  const [copied, setCopied] = useState(false);

  const whatsAppMessage = `🤘 Join me on Blast Riff, the heavy metal trivia game! We both get 3 days of TRVE PASS when you play your first game: ${joinUrl}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-metal text-lg text-text">INVITE METALHEADS</h2>
      <p className="mb-4 text-xs text-text-muted">Earn 3 days of TRVE PASS for each friend who plays.</p>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background p-2">
        <input readOnly value={joinUrl} className="flex-1 truncate bg-transparent px-2 text-sm text-text outline-none" />
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-primary-hover"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
      >
        Invite via WhatsApp
      </a>

      <p className="text-center text-xs text-text-muted">
        You&apos;ve brought <span className="font-semibold text-gold">{referralCount}</span> metalhead
        {referralCount === 1 ? "" : "s"} to the pit
      </p>
    </section>
  );
}
