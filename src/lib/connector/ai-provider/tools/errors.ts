/**
 * AI Tools Error Classes
 */

/**
 * Error thrown when AI is unavailable for a specific operation
 */
export class AIUnavailableError extends Error {
  constructor(operation: string) {
    super(`AI unavailable for ${operation}. Please try again later.`);
    this.name = "AIUnavailableError";
  }
}
