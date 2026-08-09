"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

export default function LoginPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(204,0,0,0.15),_transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <h1 className="font-metal text-4xl text-text sm:text-5xl">BLAST RIFF</h1>
        <p className="max-w-sm text-text-muted">
          Prove you&apos;re a trve metalhead. Sign in to start blasting through riffs and trivia.
        </p>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg bg-primary px-6 py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover"
          >
            ENTER THE PIT
          </button>
        )}
      </div>

      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </main>
  );
}
