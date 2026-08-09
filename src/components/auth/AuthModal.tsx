"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type AuthTab = "signup" | "login";

const authSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormValues = z.infer<typeof authSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>("signup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<"google" | "apple" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
  });

  function switchTab(nextTab: AuthTab) {
    setTab(nextTab);
    setFormError(null);
    reset();
  }

  async function onSubmit(values: AuthFormValues) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const { error } =
        tab === "signup"
          ? await signUpWithEmail(values.email, values.password)
          : await signInWithEmail(values.email, values.password);

      if (error) {
        setFormError(error.message);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsOAuthLoading("google");
    setFormError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setFormError(error.message);
      setIsOAuthLoading(null);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-t-2xl border-t-4 border-primary bg-surface p-6 shadow-2xl sm:rounded-2xl sm:border-t-4"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text"
            >
              <X size={20} />
            </button>

            <h2 className="mb-6 font-metal text-2xl text-text">
              {tab === "signup" ? "JOIN THE HORDE" : "WELCOME BACK"}
            </h2>

            <div className="mb-6 flex rounded-lg border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-semibold tracking-wide transition-colors",
                  tab === "signup" ? "bg-primary text-text" : "text-text-muted hover:text-text"
                )}
              >
                NEW METALHEAD
              </button>
              <button
                type="button"
                onClick={() => switchTab("login")}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-semibold tracking-wide transition-colors",
                  tab === "login" ? "bg-primary text-text" : "text-text-muted hover:text-text"
                )}
              >
                ALREADY TRVE
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isOAuthLoading !== null}
                className="flex items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated py-3 text-sm font-semibold text-text transition-colors hover:border-primary disabled:opacity-60"
              >
                {isOAuthLoading === "google" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="flex items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated py-3 text-sm font-semibold text-text opacity-60"
              >
                <AppleIcon />
                Continue with Apple
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs tracking-widest text-text-muted">OR USE EMAIL</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-text outline-none transition-colors focus:border-primary"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-text outline-none transition-colors focus:border-primary"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-error">{errors.password.message}</p>
                )}
              </div>

              {formError && <p className="text-sm text-error">{formError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {tab === "signup" ? "CREATE MY METAL IDENTITY" : "ENTER THE PIT"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.85Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.235-1.213 3.05-.822.89-2.15 1.573-3.257 1.484-.144-1.09.404-2.235 1.169-2.966.83-.798 2.242-1.408 3.301-1.568ZM20.638 17.13c-.53 1.223-.784 1.77-1.466 2.85-.95 1.51-2.29 3.39-3.95 3.405-1.474.015-1.854-.964-3.856-.954-2.001.01-2.42.97-3.895.955-1.66-.015-2.928-1.716-3.878-3.226-2.658-4.208-2.94-9.15-1.3-11.78 1.166-1.867 3.007-2.96 4.739-2.96 1.762 0 2.87 1.01 4.328 1.01 1.413 0 2.271-1.012 4.318-1.012 1.545 0 3.181.842 4.348 2.294-3.822 2.096-3.202 7.548.612 9.418Z" />
    </svg>
  );
}
