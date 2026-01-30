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
  private readonly MAX_LOGS_PER_RUN = 500;
  private readonly LOG_RETENTION_MS = 1000 * 60 * 60; // 1 hour

  startRun(automationId: string): void {
    console.log(`[Logger] Starting run for automation ${automationId}`);
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
    this.logStores.delete(automationId);
  }

  isRunning(automationId: string): boolean {
    return this.logStores.get(automationId)?.isRunning || false;
  }
}

export const automationLogger = new AutomationLoggerService();
