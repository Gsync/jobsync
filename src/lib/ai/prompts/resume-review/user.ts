/**
 * Resume Review User Prompt
 * Constructs the user prompt for comprehensive resume analysis
 */

/**
 * Build user prompt for comprehensive resume review
 */
export function buildResumeReviewPrompt(resumeText: string): string {
  return `Analyze this resume thoroughly and return a structured JSON response.

## RESUME TO ANALYZE:

${resumeText}

## ANALYSIS INSTRUCTIONS:

1. **Scores** - Assess the resume on multiple dimensions:
   - overall: Overall quality score (0-100)
   - impact: Achievement impact and measurable results
   - clarity: Organization, readability, professional writing
   - atsCompatibility: ATS-friendliness, proper formatting

2. **Achievements** - Categorize achievements found:
   - strong: Quote achievements with numbers/metrics
   - weak: Quote vague statements needing quantification
   - missingMetrics: Suggest specific metrics to add

3. **Keywords** - Analyze keyword presence:
   - found: Technical skills, tools, methodologies present
   - missing: Important keywords for the role that should be added
   - overused: Buzzwords or clichés used excessively

4. **Action Verbs** - Assess language strength:
   - strong: Powerful verbs like Led, Architected, Delivered
   - weak: Weak verbs like "Responsible for", "Helped with"
   - suggestions: Specific replacement recommendations

5. **Section Feedback** - Evaluate each resume section:
   - Key by section name (Summary, Experience, Skills, Education, etc.)
   - Provide status (good/needsWork/missing) and specific feedback

6. **ATS Issues** - Only list issues that ACTUALLY EXIST in this resume:
   - Check for: tables, graphics, unusual fonts (only report if found)
   - Check for: missing standard sections like Education, Skills (only report if truly missing)
   - Check for: parsing problems (only report if present)
   - If no ATS issues exist, return an empty array

7. **Top Improvements** - Prioritize 3-5 changes:
   - Rank by impact (priority 1 = highest)
   - Be specific about issue and fix

8. **Grammar and Spelling** - Note all errors:
   - Quote exact text with errors
   - Note punctuation inconsistencies
   - Flag consistency issues (tense, formatting)

9. **Summary** - 2-3 sentence assessment:
   - Mention overall score
   - Highlight top strength
   - Note most impactful improvement

Be specific and reference actual content from this resume.
Every suggestion must be actionable with concrete examples.`;
}
