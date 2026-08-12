"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { USERNAME_REGEX } from "@/lib/onboarding";
import { track } from "@/lib/analytics/client";
import { StepGenres } from "@/components/onboarding/StepGenres";
import { StepIdentity, type UsernameStatus } from "@/components/onboarding/StepIdentity";
import { StepWelcome } from "@/components/onboarding/StepWelcome";

interface OnboardingFlowProps {
  userId: string;
  redirectTo: string;
}

export function OnboardingFlow({ userId, redirectTo }: OnboardingFlowProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [countryCode, setCountryCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleGenre(genreId: string) {
    setSelectedGenres((current) => {
      if (current.includes(genreId)) {
        return current.filter((id) => id !== genreId);
      }
      if (current.length >= 3) return current;
      return [...current, genreId];
    });
  }

  function handleUsernameChange(value: string) {
    setUsername(value);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!USERNAME_REGEX.test(value)) {
      setUsernameStatus(value.length === 0 ? "idle" : "invalid");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value)
        .neq("id", userId)
        .maybeSingle();

      setUsernameStatus(data ? "taken" : "available");
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function handleClaimIdentity() {
    if (usernameStatus !== "available" || !countryCode || !avatar) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: username,
        country_code: countryCode,
        preferred_genres: selectedGenres,
        avatar_url: avatar,
      })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setUsernameStatus("taken");
        setError("That name was just claimed by someone else.");
      } else {
        setError("Something went wrong. Try again.");
      }
      return;
    }

    setStep(3);
  }

  function handleEnter() {
    track("onboarding_completed", {});
    router.push(redirectTo);
  }

  if (step === 1) {
    return <StepGenres selected={selectedGenres} onToggle={toggleGenre} onContinue={() => setStep(2)} />;
  }

  if (step === 2) {
    return (
      <StepIdentity
        username={username}
        onUsernameChange={handleUsernameChange}
        usernameStatus={usernameStatus}
        countryCode={countryCode}
        onCountryChange={setCountryCode}
        avatar={avatar}
        onAvatarChange={setAvatar}
        error={error}
        saving={saving}
        onBack={() => setStep(1)}
        onContinue={handleClaimIdentity}
      />
    );
  }

  return <StepWelcome username={username} avatar={avatar} onEnter={handleEnter} />;
}
