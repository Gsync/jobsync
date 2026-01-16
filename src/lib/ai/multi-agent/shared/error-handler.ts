/**
 * Standardized Error Handling
 *
 * Provides consistent error handling patterns for the multi-agent system.
 */

import { ProgressStream } from "../../progress-stream";
import { AIUnavailableError } from "../../tools";

export type OperationType = "resume analysis" | "job matching";
export type StepType = "tool-extraction" | "analysis-agent";

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("timed out");
}

export function handleExtractionError(
  error: unknown,
  progressStream: ProgressStream | undefined,
  operationType: OperationType
): never {
  const isTimeout = isTimeoutError(error);

  console.error(`[${operationType}] Semantic extraction failed:`, error);

  if (progressStream) {
    const warningMsg = isTimeout
      ? "AI model is taking too long. Please try again or use a different model."
      : `AI unavailable for ${operationType}. Please try again later.`;
    progressStream.sendWarning("tool-extraction", warningMsg, 0);
  }

  throw new AIUnavailableError(operationType);
}

export function handleAgentError(
  error: unknown,
  progressStream: ProgressStream | undefined,
  operationType: OperationType
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isTimeout = isTimeoutError(error);

  console.error(`[${operationType}] Agent execution failed:`, error);

  if (progressStream) {
    const warningMsg = isTimeout
      ? "Analysis is taking too long. Please try again or use a faster model."
      : "Analysis failed. Please try again.";
    progressStream.sendWarning("analysis-agent", warningMsg, 1);
  }

  const actionName = operationType === "resume analysis"
    ? "Resume review"
    : "Job match analysis";

  throw new Error(
    isTimeout
      ? `${actionName} timed out. The AI model may be overloaded. Please try again.`
      : `${actionName} failed: ${errorMessage}`
  );
}
