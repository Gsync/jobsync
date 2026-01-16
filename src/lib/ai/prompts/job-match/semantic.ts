/**
 * Job Match Semantic Prompts
 *
 * Provider-aware prompts for skill matching and similarity analysis.
 */

import { ProviderType } from "../../providers";

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
