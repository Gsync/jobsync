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

export {
  BrokenCircuitError,
  TaskCancelledError,
  BulkheadRejectedError,
} from "cockatiel";

export class EuresApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const euresRetry = retry(
  handleWhen((err) => {
    if (err instanceof EuresApiError) {
      return err.status >= 500 || err.status === 429;
    }
    return true;
  }),
  { maxAttempts: 3, backoff: new ExponentialBackoff() },
);

const euresBreaker = circuitBreaker(
  handleWhen((err) => {
    if (err instanceof EuresApiError) return err.status >= 500;
    return true;
  }),
  {
    halfOpenAfter: 30_000,
    breaker: new ConsecutiveBreaker(5),
  },
);

const euresTimeout = timeout(15_000, TimeoutStrategy.Cooperative);

const euresBulkhead = bulkhead(5, 10);

export const euresPolicy = wrap(
  euresRetry,
  euresBreaker,
  euresTimeout,
  euresBulkhead,
);

export async function resilientFetch<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  return euresPolicy.execute(async ({ signal }) => {
    const response = await fetch(url, { ...init, signal });

    if (!response.ok) {
      throw new EuresApiError(
        response.status,
        `EURES API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  });
}
