/**
 * Resume Review Semantic Prompts
 *
 * Provider-aware prompts for keyword extraction and action verb analysis.
 */

import { ProviderType } from "../../providers";

/**
 * Get keyword extraction prompt based on provider
 * Ollama: ~120 tokens | Cloud: ~220 tokens (37% reduction)
 */
export function getKeywordPrompt(
  provider: ProviderType,
  text: string,
  contextHint?: string
): string {
  if (provider === "ollama") {
    return `Extract technical skills and tools from text.

Text:
${text.substring(0, 1500)}

Output technical_skills, tools, total_count.`;
  }

  // Cloud prompt: Optimized (~220 tokens) - concise but comprehensive
  return `Extract all technical skills and expertise from this text.
${contextHint ? `Context: ${contextHint} position.\n` : ""}
Categories: technical_skills, tools_platforms, methodologies, domain_knowledge, soft_skills.
Be comprehensive - extract EVERY term. Recognize synonyms (k8s=Kubernetes, JS=JavaScript).
Consider context to avoid false matches.

Text:
"""
${text.substring(0, 4000)}
"""`;
}

/**
 * Get action verb analysis prompt based on provider
 * Ollama: ~130 tokens | Cloud: ~280 tokens (49% reduction)
 */
export function getVerbPrompt(provider: ProviderType, text: string): string {
  if (provider === "ollama") {
    return `Find action verbs in resume.

Resume:
${text.substring(0, 1500)}

Output strong_verbs, weak_verbs, verb_strength_score (0-10).`;
  }

  // Cloud: Optimized (~280 tokens) - concise with key examples
  return `Analyze action verbs and language strength in this resume.

STRONG verbs (high impact): Led, Architected, Spearheaded, Delivered, Built, Scaled, Transformed
STRONG verbs (medium): Managed, Developed, Implemented, Created, Designed
WEAK verbs to flag: "Responsible for", "Tasked with", "Helped with", "Worked on"

For weak verbs found, suggest stronger alternatives based on context.

Resume:
"""
${text.substring(0, 4000)}
"""

Score verb_strength_score 0-10 (0-3: passive, 4-6: mixed, 7-10: strong)`;
}
