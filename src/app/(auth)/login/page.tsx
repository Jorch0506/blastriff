"use client";

import { Suspense, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Footer } from "@/components/layout/Footer";

export default function LoginPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(204,0,0,0.15),_transparent_60%)]" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
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
      </main>

      <Suspense fallback={null}>
        <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </Suspense>

      <Footer />
    </div>
  );
}
