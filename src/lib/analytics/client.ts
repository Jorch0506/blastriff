import posthog from "posthog-js";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

export function track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}
