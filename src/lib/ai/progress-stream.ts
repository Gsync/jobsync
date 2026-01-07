/**
 * Progress Streaming for Multi-Agent Collaboration
 * Sends real-time updates to the client about which agent is working
 */

export type AgentStep =
  | "data-analyzer"
  | "keyword-expert"
  | "scoring-specialist"
  | "feedback-expert"
  | "synthesis-coordinator"
  | "validation"
  | "complete";

export interface ProgressUpdate {
  step: AgentStep;
  status: "started" | "completed";
  message: string;
  timestamp: number;
  agentNumber?: number;
  totalAgents?: number;
  /** Start time of this step (for timeout tracking on client) */
  startTime?: number;
  /** Estimated duration in milliseconds for this step */
  estimatedDurationMs?: number;
}

// Estimated durations for each agent step (in milliseconds)
const ESTIMATED_DURATIONS: Record<AgentStep, number> = {
  "data-analyzer": 8000, // 8 seconds (runs in parallel with keyword-expert)
  "keyword-expert": 8000, // 8 seconds (runs in parallel with data-analyzer)
  "scoring-specialist": 10000, // 10 seconds
  "feedback-expert": 8000, // 8 seconds
  "synthesis-coordinator": 12000, // 12 seconds
  validation: 2000, // 2 seconds
  complete: 0,
};

export const AGENT_STEPS: Record<
  AgentStep,
  { name: string; description: string; emoji: string; estimatedDurationMs: number }
> = {
  "data-analyzer": {
    name: "Data Analyzer",
    description: "Extracting objective metrics and counting achievements",
    emoji: "📊",
    estimatedDurationMs: ESTIMATED_DURATIONS["data-analyzer"],
  },
  "keyword-expert": {
    name: "Keyword Expert",
    description: "Analyzing ATS optimization and keyword strategy",
    emoji: "🔑",
    estimatedDurationMs: ESTIMATED_DURATIONS["keyword-expert"],
  },
  "scoring-specialist": {
    name: "Scoring Specialist",
    description: "Calculating fair, calibrated scores",
    emoji: "📈",
    estimatedDurationMs: ESTIMATED_DURATIONS["scoring-specialist"],
  },
  "feedback-expert": {
    name: "Feedback Expert",
    description: "Creating actionable recommendations",
    emoji: "💡",
    estimatedDurationMs: ESTIMATED_DURATIONS["feedback-expert"],
  },
  "synthesis-coordinator": {
    name: "Synthesis Coordinator",
    description: "Combining insights from all agents",
    emoji: "🔄",
    estimatedDurationMs: ESTIMATED_DURATIONS["synthesis-coordinator"],
  },
  validation: {
    name: "Quality Assurance",
    description: "Validating output consistency",
    emoji: "✅",
    estimatedDurationMs: ESTIMATED_DURATIONS["validation"],
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
  totalAgents: number = 5
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
}
