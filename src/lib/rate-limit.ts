import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstashConfig =
  !!process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://") &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "blastriff",
    })
  : null;

const MEMORY_LIMIT = 30;
const MEMORY_WINDOW_MS = 60_000;
const memoryHits = new Map<string, { count: number; resetAt: number }>();

function checkMemoryLimit(key: string): boolean {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + MEMORY_WINDOW_MS });
    return true;
  }
  if (entry.count >= MEMORY_LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function checkRateLimit(identifier: string): Promise<boolean> {
  if (ratelimit) {
    const { success } = await ratelimit.limit(identifier);
    return success;
  }
  return checkMemoryLimit(identifier);
}
