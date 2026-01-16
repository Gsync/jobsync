/**
 * Resume Review User Prompts
 *
 * Functions to construct user prompts for resume analysis.
 */

/**
 * Build user prompt for resume review with chain-of-thought instructions
 */
export function buildResumeReviewPrompt(resumeText: string): string {
  return `Analyze this resume using your expert methodology.

## YOUR TASK

Follow the 5-phase analytical process from your training:

### PHASE 1: RECONNAISSANCE
- What industry/role is this resume for?
- What career stage (entry/mid/senior/executive)?
- Adjust your baseline expectations accordingly.

### PHASE 2: FORENSIC COUNTING (be literal)
Count these elements EXACTLY:
- Quantified achievements (%, $, numbers)
- Technical/industry keywords
- Strong vs weak action verbs

### PHASE 3: QUALITATIVE ASSESSMENT
Evaluate:
- Formatting quality (visual hierarchy, ATS-friendliness)
- Professional summary effectiveness
- Experience clarity (STAR format, progression)
- Skills section organization
- Grammar/spelling

### PHASE 4: CALCULATE & SHOW MATH
"Keywords: X + Quantified: Y + Verbs: Z + Formatting: A + Summary: B + Clarity: C + Skills: D + Grammar: E = TOTAL"

### PHASE 5: SELF-CRITIQUE
Before finalizing:
□ Did I count actual elements (not estimate)?
□ Is my score realistic for this career stage?
□ Are my suggestions SPECIFIC to THIS resume?
□ Did I include at least one HIGH-IMPACT improvement?

---

## RESUME TO ANALYZE:

${resumeText}

---

## OUTPUT REQUIREMENTS

Provide your structured assessment with:
1. **score**: Your calculated total (0-100)
2. **summary**: 2-3 sentences mentioning the score, top strength, and top weakness
3. **strengths**: 3-5 specific strengths WITH evidence from the resume
4. **weaknesses**: 3-5 specific weaknesses with WHY they matter
5. **suggestions**: 3-5 actionable improvements with EXACTLY what to do

Remember: Reference SPECIFIC text from this resume. No generic feedback.`;
}
