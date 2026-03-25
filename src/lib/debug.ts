export type DebugCategory = "scheduler" | "runner" | "automationLogger";

/**
 * Gated debug logging. Checks DEBUG_LOGGING env variable.
 * Default: enabled (logs unless DEBUG_LOGGING=false).
 */
export function debugLog(category: DebugCategory, ...args: unknown[]): void {
  if (process.env.DEBUG_LOGGING === "false") return;
  console.log(`[${category}]`, ...args);
}

export function debugError(category: DebugCategory, ...args: unknown[]): void {
  if (process.env.DEBUG_LOGGING === "false") return;
  console.error(`[${category}]`, ...args);
}
