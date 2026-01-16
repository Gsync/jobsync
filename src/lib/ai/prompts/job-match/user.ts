/**
 * Job Match User Prompts
 *
 * Functions to construct user prompts for job match analysis.
 */

/**
 * Build user prompt for job match with chain-of-thought instructions
 */
export function buildJobMatchPrompt(
  resumeText: string,
  jobText: string
): string {
  return `Analyze this job-candidate match using your expert methodology.

## YOUR TASK

Follow the 5-phase analytical process from your training:

### PHASE 1: JOB REQUIREMENT EXTRACTION
Parse the job description completely:
- **Must-Have Skills**: What's explicitly required?
- **Nice-to-Have Skills**: What's preferred/bonus?
- **Experience Requirements**: Years, level, type
- **Qualifications**: Education, certifications
- **Keywords**: Important terms that appear multiple times

### PHASE 2: RESUME MATCHING
Create a match checklist:
| Requirement | Found? | Evidence | Match % |
For each job requirement, search the resume and note:
- Exact matches (100%)
- Related/synonym matches (60-80%)
- Adjacent skill matches (30-50%)
- Missing (0%)

### PHASE 3: SCORING (show your math)
1. **Skills Match (0-30 pts)**: X of Y skills = Z%
2. **Experience Match (0-25 pts)**: Candidate years vs required years
3. **Keyword Overlap (0-20 pts)**: X of Y keywords found
4. **Qualifications (0-15 pts)**: Education + certifications
5. **Industry Fit (0-10 pts)**: Domain relevance

### PHASE 4: STRATEGIC RECOMMENDATIONS
Provide actionable advice:
- **Quick Wins**: Keywords/skills to add to resume TODAY
- **Short-term**: Certifications, portfolio pieces (1-2 weeks)
- **Long-term**: Skills to develop (1-3 months)
- **Application Decision**: Apply now? Wait? Skip?

### PHASE 5: SELF-CRITIQUE
Before finalizing:
□ Did I extract ALL requirements from the job?
□ Did I search the resume for EACH requirement?
□ Are my suggestions SPECIFIC (exact keywords)?
□ Did I give a clear apply/don't apply recommendation?

---

## JOB DESCRIPTION:

${jobText}

---

## CANDIDATE RESUME:

${resumeText}

---

## OUTPUT REQUIREMENTS

Provide your structured assessment with:
1. **matching_score**: Your calculated total (0-100)
2. **detailed_analysis**: 3-5 categories showing your scoring breakdown
   - MUST include: Skills Match, Experience Match, Keyword Overlap
   - Show specific counts and evidence
3. **suggestions**: 2-4 categories of actionable improvements
   - Include EXACT keywords to add
   - Include SPECIFIC skills to highlight
4. **additional_comments**: 2-3 sentences with:
   - Overall candidacy assessment
   - Top priority improvement
   - Clear recommendation (apply now/tailor resume/upskill first)

Remember: Be SPECIFIC. Quote actual text. List exact keywords.`;
}
