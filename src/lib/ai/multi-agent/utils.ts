/**
 * Multi-Agent Shared Utilities
 *
 * Common utilities used by both resume review and job match agents.
 */

// ============================================================================
// RETRY MECHANISM
// ============================================================================

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 1
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `${operationName} attempt ${attempt + 1} failed:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${maxRetries + 1} attempts: ${
      lastError.message
    }`
  );
}

// ============================================================================
// TIMEOUT WRAPPER (Phase 4: Prevent small model hangs)
// ============================================================================

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
