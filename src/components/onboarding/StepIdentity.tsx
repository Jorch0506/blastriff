"use client";

import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { AVATAR_OPTIONS, ONBOARDING_COUNTRIES, flagEmoji, generateUsernameSuggestions } from "@/lib/onboarding";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface StepIdentityProps {
  username: string;
  onUsernameChange: (value: string) => void;
  usernameStatus: UsernameStatus;
  countryCode: string;
  onCountryChange: (value: string) => void;
  avatar: string;
  onAvatarChange: (value: string) => void;
  error: string | null;
  saving: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function StepIdentity({
  username,
  onUsernameChange,
  usernameStatus,
  countryCode,
  onCountryChange,
  avatar,
  onAvatarChange,
  error,
  saving,
  onBack,
  onContinue,
}: StepIdentityProps) {
  const suggestions = generateUsernameSuggestions();
  const canContinue = usernameStatus === "available" && countryCode !== "" && avatar !== "" && !saving;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3 }}
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Step 2 of 3</p>
        <h1 className="mt-2 font-metal text-2xl leading-tight text-text">CLAIM YOUR IDENTITY</h1>
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Username
        </label>
        <div className="relative">
          <input
            id="username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            maxLength={20}
            placeholder="TrveKvlt_666"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text outline-none focus:border-primary"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && <Loader2 size={18} className="animate-spin text-text-muted" />}
            {usernameStatus === "available" && <Check size={18} className="text-success" />}
            {(usernameStatus === "taken" || usernameStatus === "invalid") && (
              <X size={18} className="text-error" />
            )}
          </span>
        </div>
        {usernameStatus === "taken" && <p className="text-xs text-error">That name is already claimed.</p>}
        {usernameStatus === "invalid" && (
          <p className="text-xs text-error">3-20 characters: letters, numbers, underscore only.</p>
        )}
        {error && <p className="text-xs text-error">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onUsernameChange(suggestion)}
              className="rounded-full border border-border px-3 py-1 text-xs text-text-muted transition-colors hover:border-gold hover:text-gold"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="country" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Country
        </label>
        <select
          id="country"
          value={countryCode}
          onChange={(event) => onCountryChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text outline-none focus:border-primary"
        >
          <option value="">Select your country</option>
          {ONBOARDING_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {flagEmoji(country.code)} {country.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Avatar</p>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onAvatarChange(option)}
              className={`flex items-center justify-center rounded-xl border p-3 text-3xl transition-colors ${
                avatar === option ? "border-gold bg-gold/10" : "border-border bg-surface hover:border-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-6 py-3 font-metal text-lg tracking-wide text-text-muted transition-colors hover:text-text"
        >
          BACK
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="flex-1 rounded-lg bg-primary py-3 font-metal text-lg tracking-wide text-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "CLAIMING..." : "CLAIM IT"}
        </button>
      </div>
    </motion.div>
  );
}
