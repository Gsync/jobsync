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
}

export const AGENT_STEPS: Record<
  AgentStep,
  { name: string; description: string; emoji: string }
> = {
  "data-analyzer": {
    name: "Data Analyzer",
    description: "Extracting objective metrics and counting achievements",
    emoji: "📊",
  },
  "keyword-expert": {
    name: "Keyword Expert",
    description: "Analyzing ATS optimization and keyword strategy",
    emoji: "🔑",
  },
  "scoring-specialist": {
    name: "Scoring Specialist",
    description: "Calculating fair, calibrated scores",
    emoji: "📈",
  },
  "feedback-expert": {
    name: "Feedback Expert",
    description: "Creating actionable recommendations",
    emoji: "💡",
  },
  "synthesis-coordinator": {
    name: "Synthesis Coordinator",
    description: "Combining insights from all agents",
    emoji: "🔄",
  },
  validation: {
    name: "Quality Assurance",
    description: "Validating output consistency",
    emoji: "✅",
  },
  complete: {
    name: "Complete",
    description: "Analysis ready",
    emoji: "🎉",
  },
};

/**
 * Creates a progress update message
 */
export function createProgressUpdate(
  step: AgentStep,
  status: "started" | "completed",
  agentNumber?: number,
  totalAgents: number = 5
): ProgressUpdate {
  const stepInfo = AGENT_STEPS[step];
  const message =
    status === "started"
      ? `${stepInfo.emoji} ${stepInfo.name}: ${stepInfo.description}...`
      : `${stepInfo.emoji} ${stepInfo.name} completed`;

  return {
    step,
    status,
    message,
    timestamp: Date.now(),
    agentNumber,
    totalAgents,
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

    const update = createProgressUpdate(step, status, agentNumber);
    const message = encodeProgressMessage(update);
    this.controller.enqueue(new TextEncoder().encode(message));
  }

  sendStarted(step: AgentStep, agentNumber?: number) {
    this.sendProgress(step, "started", agentNumber);
  }

  sendCompleted(step: AgentStep, agentNumber?: number) {
    this.sendProgress(step, "completed", agentNumber);
  }
}
