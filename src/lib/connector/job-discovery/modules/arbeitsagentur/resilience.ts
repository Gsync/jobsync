import {
  retry,
  circuitBreaker,
  timeout,
  bulkhead,
  wrap,
  handleWhen,
  ConsecutiveBreaker,
  ExponentialBackoff,
  TimeoutStrategy,
} from "cockatiel";

import { TokenBucketRateLimiter } from "../eures/rate-limiter";

export {
  BrokenCircuitError,
  TaskCancelledError,
  BulkheadRejectedError,
} from "cockatiel";

export class ArbeitsagenturApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Retry up to 3 times on transient failures (5xx, 429, network errors). */
const aaRetry = retry(
  handleWhen((err) => {
    if (err instanceof ArbeitsagenturApiError) {
      return err.status >= 500 || err.status === 429;
    }
    return true; // network errors
  }),
  { maxAttempts: 3, backoff: new ExponentialBackoff() },
);

/** Open circuit after 5 consecutive failures, half-open after 30 s. */
const aaBreaker = circuitBreaker(
  handleWhen((err) => {
    if (err instanceof ArbeitsagenturApiError) return err.status >= 500;
    return true;
  }),
  {
    halfOpenAfter: 30_000,
    breaker: new ConsecutiveBreaker(5),
  },
);

/** Per-request timeout of 15 seconds. */
const aaTimeout = timeout(15_000, TimeoutStrategy.Cooperative);

/** Allow max 5 concurrent requests with a queue of 10. */
const aaBulkhead = bulkhead(5, 10);

export const arbeitsagenturPolicy = wrap(
  aaRetry,
  aaBreaker,
  aaTimeout,
  aaBulkhead,
);

/**
 * Token-bucket rate limiter: 3 tokens, refill every 500 ms.
 * Prevents burst traffic to the Arbeitsagentur API.
 */
const aaRateLimiter = new TokenBucketRateLimiter(3, 500);

/**
 * Fetch a URL through the resilience policy (retry, circuit breaker,
 * timeout, bulkhead) with rate limiting.
 */
export async function resilientFetch<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  await aaRateLimiter.acquire();
  return arbeitsagenturPolicy.execute(async ({ signal }) => {
    const response = await fetch(url, { ...init, signal });

    if (!response.ok) {
      throw new ArbeitsagenturApiError(
        response.status,
        `Arbeitsagentur API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  });
}
