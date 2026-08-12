"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { useAuth } from "@/hooks/useAuth";

export function PostHogIdentify() {
  const posthog = usePostHog();
  const { user, isAuthenticated } = useAuth();
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;

    if (isAuthenticated && user) {
      if (identifiedId.current !== user.id) {
        posthog.identify(user.id);
        identifiedId.current = user.id;
      }
    } else if (identifiedId.current !== null) {
      posthog.reset();
      identifiedId.current = null;
    }
  }, [posthog, isAuthenticated, user]);

  return null;
}
