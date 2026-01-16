/**
 * Progress Streaming for Multi-Agent Collaboration
 * Sends real-time updates to the client about which agent is working
 */

export type AgentStep =
  | "tool-extraction"
  | "analysis-agent"
  | "feedback-agent"
  | "complete";

export interface ProgressUpdate {
  step: AgentStep;
  status: "started" | "completed" | "warning";
  message: string;
  timestamp: number;
  agentNumber?: number;
  totalAgents?: number;
  /** Start time of this step (for timeout tracking on client) */
  startTime?: number;
  /** Estimated duration in milliseconds for this step */
  estimatedDurationMs?: number;
  /** User-friendly warning message when something goes wrong */
  warningMessage?: string;
}

// Estimated durations for each agent step (in milliseconds)
const ESTIMATED_DURATIONS: Record<AgentStep, number> = {
  "tool-extraction": 3000,
  "analysis-agent": 12000,
  "feedback-agent": 10000,
  complete: 0,
};

export const AGENT_STEPS: Record<
  AgentStep,
  {
    name: string;
    description: string;
    emoji: string;
    estimatedDurationMs: number;
  }
> = {
  "tool-extraction": {
    name: "Tool Extraction",
    description: "Extracting objective metrics and keywords",
    emoji: "🔧",
    estimatedDurationMs: ESTIMATED_DURATIONS["tool-extraction"],
  },
  "analysis-agent": {
    name: "Analysis Agent",
    description: "Comprehensive analysis with scoring",
    emoji: "🧠",
    estimatedDurationMs: ESTIMATED_DURATIONS["analysis-agent"],
  },
  "feedback-agent": {
    name: "Feedback Agent",
    description: "Generating actionable recommendations",
    emoji: "💬",
    estimatedDurationMs: ESTIMATED_DURATIONS["feedback-agent"],
  },
  complete: {
    name: "Complete",
    description: "Analysis ready",
    emoji: "🎉",
    estimatedDurationMs: ESTIMATED_DURATIONS["complete"],
  },
};

/**
 * Creates a progress update message with timing information
 */
export function createProgressUpdate(
  step: AgentStep,
  status: "started" | "completed",
  agentNumber?: number,
  totalAgents: number = 3
): ProgressUpdate {
  const stepInfo = AGENT_STEPS[step];
  const now = Date.now();
  const message =
    status === "started"
      ? `${stepInfo.emoji} ${stepInfo.name}: ${stepInfo.description}...`
      : `${stepInfo.emoji} ${stepInfo.name} completed`;

  return {
    step,
    status,
    message,
    timestamp: now,
    agentNumber,
    totalAgents,
    // Include start time for timeout tracking on the client
    startTime: status === "started" ? now : undefined,
    // Include estimated duration so client can show progress/warning
    estimatedDurationMs:
      status === "started" ? stepInfo.estimatedDurationMs : undefined,
  };
}

/**
 * Encodes progress update as SSE message
 */
export function encodeProgressMessage(update: ProgressUpdate): string {
  return `data: ${JSON.stringify(update)}\n\n`;
}

/**
 * Helper to send progress through a stream controller
 */
export class ProgressStream {
  private controller:
    | ReadableStreamDefaultController
    | TransformStreamDefaultController
    | null = null;

  constructor(
    controller?:
      | ReadableStreamDefaultController
      | TransformStreamDefaultController
  ) {
    this.controller = controller || null;
  }

  setController(
    controller:
      | ReadableStreamDefaultController
      | TransformStreamDefaultController
  ) {
    this.controller = controller;
  }

  sendProgress(
    step: AgentStep,
    status: "started" | "completed",
    agentNumber?: number
  ) {
    if (!this.controller) return;

    try {
      const update = createProgressUpdate(step, status, agentNumber);
      const message = encodeProgressMessage(update);
      this.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Controller may be closed (client disconnected, timeout, etc.)
      // Silently ignore as this is expected when the stream ends
    }
  }

  sendStarted(step: AgentStep, agentNumber?: number) {
    this.sendProgress(step, "started", agentNumber);
  }

  sendCompleted(step: AgentStep, agentNumber?: number) {
    this.sendProgress(step, "completed", agentNumber);
  }

  sendWarning(step: AgentStep, warningMessage: string, agentNumber?: number) {
    if (!this.controller) return;

    try {
      const update: ProgressUpdate = {
        step,
        status: "warning",
        message: `⚠️ ${warningMessage}`,
        timestamp: Date.now(),
        agentNumber,
        warningMessage,
      };
      const message = encodeProgressMessage(update);
      this.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Controller may be closed
    }
  }
}
