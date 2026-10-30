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

/**
 * Error thrown when no API key is configured for a provider
 */
export class MissingCredentialError extends Error {
  constructor(providerName: string) {
    super(`${providerName} credential not configured`);
    this.name = "MissingCredentialError";
  }
}
