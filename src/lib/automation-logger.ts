export type LogLevel = "info" | "success" | "warning" | "error";

export interface AutomationLog {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogStore {
  logs: AutomationLog[];
  isRunning: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

class AutomationLoggerService {
  private logStores = new Map<string, LogStore>();
  // Cancel requests for in-flight runs. Lives on the same shared singleton as
  // the log stores so the cancel route and the run route observe the same state.
  private cancelRequests = new Set<string>();
  private readonly MAX_LOGS_PER_RUN = 500;
  private readonly LOG_RETENTION_MS = 1000 * 60 * 60; // 1 hour

  startRun(automationId: string): void {
    console.log(`[Logger] Starting run for automation ${automationId}`);
    // Drop any stale cancel flag from a prior run before starting a new one.
    this.cancelRequests.delete(automationId);
    this.logStores.set(automationId, {
      logs: [],
      isRunning: true,
      startedAt: new Date(),
    });
    this.log(automationId, "info", "Automation run started");
    console.log(
      `[Logger] Log store initialized with ${this.logStores.get(automationId)?.logs.length} logs`,
    );
  }

  endRun(automationId: string): void {
    this.cancelRequests.delete(automationId);
    const store = this.logStores.get(automationId);
    if (store) {
      store.isRunning = false;
      store.completedAt = new Date();
      this.log(automationId, "info", "Automation run completed");

      // Schedule cleanup after retention period
      setTimeout(() => {
        this.clearLogs(automationId);
      }, this.LOG_RETENTION_MS);
    }
  }

  // Cancellation: the cancel route flags a run; the runner polls and aborts.
  requestCancel(automationId: string): void {
    this.cancelRequests.add(automationId);
  }

  isCancelRequested(automationId: string): boolean {
    return this.cancelRequests.has(automationId);
  }

  log(
    automationId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const store = this.logStores.get(automationId);
    if (!store) {
      console.warn(
        `[Logger] No store found for automation ${automationId}. Log: [${level}] ${message}`,
      );
      return;
    }

    const log: AutomationLog = {
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    store.logs.push(log);
    console.log(
      `[Logger] Logged [${level}] for ${automationId}: ${message} (total logs: ${store.logs.length})`,
    );

    // Keep only the most recent logs
    if (store.logs.length > this.MAX_LOGS_PER_RUN) {
      store.logs.shift();
    }
  }

  getLogs(automationId: string): AutomationLog[] {
    return this.logStores.get(automationId)?.logs || [];
  }

  getStore(automationId: string): LogStore | undefined {
    return this.logStores.get(automationId);
  }

  clearLogs(automationId: string): void {
    const store = this.logStores.get(automationId);
    // Don't drop the store mid-run: the runner keeps writing to it, and a
    // deleted store means every later log is discarded ("No store found").
    // Clearing during a run just empties the visible log buffer.
    if (store?.isRunning) {
      store.logs = [];
      return;
    }
    this.logStores.delete(automationId);
  }

  isRunning(automationId: string): boolean {
    return this.logStores.get(automationId)?.isRunning || false;
  }
}

// Persist a single instance on globalThis. Next.js can load this module in
// separate route bundles, giving each route its own copy — which would let the
// /cancel route set a cancel flag the /run runner never sees. Sharing one
// instance (like the Prisma singleton in db.ts) keeps the flag and log stores
// visible across all routes.
declare const globalThis: {
  automationLoggerGlobal: AutomationLoggerService;
} & typeof global;

export const automationLogger =
  globalThis.automationLoggerGlobal ?? new AutomationLoggerService();

if (process.env.NODE_ENV !== "production") {
  globalThis.automationLoggerGlobal = automationLogger;
}
