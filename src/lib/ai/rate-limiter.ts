/**
 * Simple in-memory rate limiter for AI requests.
 * Limits requests per user per time window.
 */

import { RATE_LIMITS } from "./config";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const { WINDOW_MS, STORE_CLEANUP_THRESHOLD } = RATE_LIMITS;

export type RateLimitBucket = "default" | "chat";

// Per-bucket limit lookup lives inside the function so config.ts's standalone
// MAX_REQUESTS re-export keeps its current meaning.
function maxRequestsFor(bucket: RateLimitBucket): number {
  return bucket === "chat"
    ? RATE_LIMITS.CHAT_MAX_REQUESTS
    : RATE_LIMITS.MAX_REQUESTS;
}

/**
 * Check if a user is rate limited.
 * @param userId - The user's ID
 * @param bucket - Independent budget; the default bucket keeps today's limit
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  userId: string,
  bucket: RateLimitBucket = "default",
): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const key = `${bucket}:${userId}`;
  const maxRequests = maxRequestsFor(bucket);
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > STORE_CLEANUP_THRESHOLD) {
    for (const [k, value] of rateLimitStore) {
      if (now > value.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return { allowed: true, remaining: maxRequests - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}
