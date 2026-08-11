"use client";

import { useAuth } from "@/hooks/useAuth";

export function useSubscription() {
  const { profile, isLoading } = useAuth();

  return {
    isPremium: profile?.is_premium ?? false,
    premiumExpiresAt: profile?.premium_expires_at ?? null,
    profileTheme: profile?.is_premium ? (profile?.profile_theme ?? null) : null,
    isLoading,
  };
}
