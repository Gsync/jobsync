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

const { WINDOW_MS, MAX_REQUESTS, STORE_CLEANUP_THRESHOLD } = RATE_LIMITS;

/**
 * Check if a user is rate limited.
 * @param userId - The user's ID
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up expired entries periodically
  if (rateLimitStore.size > STORE_CLEANUP_THRESHOLD) {
    for (const [key, value] of rateLimitStore) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: entry.resetTime - now,
  };
}
