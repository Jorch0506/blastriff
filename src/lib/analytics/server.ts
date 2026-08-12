import { PostHog } from "posthog-node";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    client = null;
    return client;
  }

  // Serverless functions can freeze/exit right after the response is sent,
  // so flush every event immediately instead of batching.
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export function trackServer<E extends AnalyticsEventName>(
  distinctId: string,
  event: E,
  properties: AnalyticsEvents[E]
) {
  const posthog = getClient();
  if (!posthog) return;
  posthog.capture({ distinctId, event, properties });
}
