import { APP_CONSTANTS } from "@/lib/constants";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX = APP_CONSTANTS.MCP_RATE_LIMIT_MAX;
const WINDOW = APP_CONSTANTS.MCP_RATE_LIMIT_WINDOW_MS;
const CLEANUP_THRESHOLD = 500;

export function checkMcpRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();

  if (store.size > CLEANUP_THRESHOLD) {
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key);
    }
  }

  const entry = store.get(userId);

  if (!entry || now > entry.resetTime) {
    store.set(userId, { count: 1, resetTime: now + WINDOW });
    return { allowed: true, remaining: MAX - 1, resetIn: WINDOW };
  }

  if (entry.count >= MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: MAX - entry.count, resetIn: entry.resetTime - now };
}
