/**
 * Phase 4: Provider-Aware Semantic Prompts
 *
 * Optimized prompts for different AI providers:
 * - Ollama: Simplified prompts (~120-200 tokens) for small local models
 * - Cloud: Optimized prompts (~220-450 tokens) with 30-50% reduction, full quality
 */

import { ProviderType } from "../providers";

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

/**
 * Get skill matching prompt based on provider
 * Ollama: ~200 tokens | Cloud: ~450 tokens (50% reduction)
 */
export function getSkillMatchPrompt(
  provider: ProviderType,
  resumeText: string,
  jobText: string
): string {
  if (provider === "ollama") {
    return `List skills from job that appear in resume.

Job skills needed:
${jobText.substring(0, 1200)}

Resume:
${resumeText.substring(0, 1200)}

Output matched_skills, missing_skills, match_percentage.`;
  }

  // Cloud: Optimized (~450 tokens) - structured but concise
  return `Compare resume skills vs job requirements as expert recruiter.

For EACH job skill, categorize:
- EXACT MATCH: Same skill in resume. Include: skill, resume_evidence (quote), job_requirement
  Example: Job "React" + Resume "Led React migration" = exact match
- RELATED MATCH: Transferable skill. Include: job_skill, resume_skill, similarity (0-100), explanation
  Example: Job "PostgreSQL" + Resume "MySQL" = related (85% similar)
- MISSING: Not in resume. Include: skill, importance (critical/important/nice-to-have), learnability (quick/moderate/significant)

Resume:
"""
${resumeText.substring(0, 3000)}
"""

Job:
"""
${jobText.substring(0, 3000)}
"""

Calculate overall_match_percentage = (exact + 0.7*related) / total_skills * 100
Provide evidence quotes for all matches.`;
}

/**
 * Get semantic similarity prompt based on provider
 * Ollama: ~170 tokens | Cloud: ~380 tokens (46% reduction)
 */
export function getSimilarityPrompt(
  provider: ProviderType,
  resumeText: string,
  jobDescription: string
): string {
  if (provider === "ollama") {
    return `Score resume-job fit 0-100.

Job:
${jobDescription.substring(0, 1200)}

Resume:
${resumeText.substring(0, 1200)}

Output similarity_score, match_explanation, key_gaps.`;
  }

  // Cloud: Optimized (~380 tokens) - concise with scoring guidelines
  return `Analyze semantic similarity between resume and job as expert recruiter.

Consider: skills alignment (incl. transferable), experience relevance, role fit, culture signals.

Scoring: 80-100 exceptional, 65-79 strong, 50-64 moderate, 35-49 weak, 0-34 poor.
(50-60 is common for decent matches)

Resume:
"""
${resumeText.substring(0, 3500)}
"""

Job:
"""
${jobDescription.substring(0, 3500)}
"""

Return:
1. similarity_score (0-100)
2. match_explanation (2-3 sentences on fit)
3. key_matches (3-5 strong match areas)
4. key_gaps (3-5 gaps with notes)
5. transferable_skills (skills that could apply to gaps)
6. application_recommendation (clear advice)`;
}
