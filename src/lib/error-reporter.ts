/**
 * Client-side error reporter with in-memory ring buffer.
 *
 * Collects errors from error boundaries, unhandled promise rejections,
 * and other sources. The buffer is in-memory only (no persistence, no DB writes)
 * and capped at MAX_ENTRIES to prevent memory leaks.
 *
 * Only captures errors in development mode by default.
 */

export interface ErrorEntry {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  componentStack?: string;
  source: "error-boundary" | "unhandled-rejection" | "console-error";
}

const MAX_ENTRIES = 100;

let buffer: ErrorEntry[] = [];
let initialized = false;

/**
 * Add an error entry to the ring buffer.
 * When the buffer exceeds MAX_ENTRIES, the oldest entries are dropped.
 */
export function reportError(entry: ErrorEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer = buffer.slice(buffer.length - MAX_ENTRIES);
  }
}

/**
 * Get all recorded errors, newest first.
 */
export function getErrors(): ErrorEntry[] {
  return [...buffer].reverse();
}

/**
 * Clear all recorded errors.
 */
export function clearErrors(): void {
  buffer = [];
}

/**
 * Get the current number of recorded errors.
 */
export function getErrorCount(): number {
  return buffer.length;
}

/**
 * Generate a unique ID for an error entry.
 */
export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Initialize client-side error capture.
 * Call once in a client layout/component to set up global error listeners.
 *
 * Only active in development mode (process.env.NODE_ENV === "development").
 */
export function initClientErrorCapture(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  initialized = true;

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    const stack =
      event.reason instanceof Error ? event.reason.stack : undefined;

    reportError({
      id: generateErrorId(),
      timestamp: new Date(),
      message,
      stack,
      source: "unhandled-rejection",
    });
  });
}
