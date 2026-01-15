/**
 * Ollama-specific utilities
 */

import type { ProviderType } from "../providers";

// Timeouts for Ollama (local models need more time)
export const SEMANTIC_TIMEOUT_MS = 60000; // 60 seconds for semantic extraction
export const AGENT_TIMEOUT_MS = 120000; // 120 seconds for agent calls

/**
 * Check if provider is Ollama (local models that need simplified prompts/schemas)
 */
export function isOllamaProvider(provider: ProviderType): boolean {
  return provider === "ollama";
}
