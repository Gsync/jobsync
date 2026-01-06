/**
 * Multi-Agent Collaboration System
 * Phase 3: Multiple specialized agents collaborate for superior analysis
 *
 * Architecture:
 * User Request → Coordinator → [Analyzer || Keyword Expert, Scoring Expert] → Synthesizer → Final Output
 *
 * Improvements:
 * - Parallel execution of independent agents
 * - Retry mechanism with exponential backoff
 * - Structured agent outputs for reliable scoring
 * - Strong typing throughout
 */

import { generateObject, generateText } from "ai";
import { z } from "zod";
import { getModel, ProviderType } from "./providers";
import { ResumeReviewSchema, JobMatchSchema } from "./schemas";
import {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
  extractRequiredSkills,
} from "./tools";
import { ProgressStream } from "./progress-stream";
import {
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
  calculateAllowedVariance,
  SCORING_GUIDELINES,
} from "./scoring";
import { ResumeReviewResponse, JobMatchResponse } from "@/models/ai.model";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AgentInsights {
  data: string;
  keywords: string;
  scoring: ScoringResult;
  feedback: string;
}

export interface ScoringResult {
  finalScore: number;
  adjustments: Array<{
    criterion: string;
    adjustment: number;
    reason: string;
  }>;
  math: string;
}

export interface CollaborativeResult<T> {
  analysis: T;
  agentInsights: AgentInsights;
  baselineScore: { score: number; breakdown: Record<string, number> };
  warnings?: string[];
}

export interface ToolDataResume {
  quantified: { count: number; examples: string[] };
  keywords: { keywords: string[]; count: number };
  verbs: { count: number; verbs: string[] };
  formatting: {
    hasBulletPoints: boolean;
    hasConsistentSpacing: boolean;
    averageLineLength: number;
    sectionCount: number;
  };
}

export interface ToolDataJobMatch {
  keywordOverlap: {
    overlapPercentage: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    totalJobKeywords: number;
  };
  resumeKeywords: { keywords: string[]; count: number };
  jobKeywords: { keywords: string[]; count: number };
  requiredSkills: {
    requiredSkills: string[];
    preferredSkills: string[];
    totalSkills: number;
  };
}

// Schema for structured scoring output
const ScoringResultSchema = z.object({
  finalScore: z
    .number()
    .min(0)
    .max(100)
    .describe("The final calculated score after all adjustments"),
  adjustments: z
    .array(
      z.object({
        criterion: z.string().describe("The criterion being adjusted"),
        adjustment: z
          .number()
          .describe("Points added (+) or subtracted (-) from baseline"),
        reason: z.string().describe("Brief explanation for this adjustment"),
      })
    )
    .describe("List of all adjustments made to the baseline score"),
  math: z
    .string()
    .describe(
      "Show your math: 'Baseline X + adjustment1 + adjustment2 - adjustment3 = Final Y'"
    ),
});

// ============================================================================
// RETRY MECHANISM
// ============================================================================

async function runWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `${operationName} attempt ${attempt + 1} failed:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`
  );
}

/**
 * Helper: Extract years of experience from resume
 */
function extractYearsOfExperience(resumeText: string): number {
  // Look for patterns like "X years", "X+ years", "X-Y years"
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\s*-\s*(\d+)\s*years/i,
  ];

  for (const pattern of patterns) {
    const match = resumeText.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // Fallback: count job positions and estimate (rough heuristic)
  const jobMatches = resumeText.match(
    /\b(20\d{2})\s*-\s*(20\d{2}|present|current)/gi
  );
  if (jobMatches && jobMatches.length > 0) {
    return Math.min(jobMatches.length * 2, 15); // Rough estimate
  }

  return 0;
}

/**
 * Helper: Extract required years from job description
 */
function extractRequiredYears(jobText: string): number {
  // Look for patterns like "X+ years required", "minimum X years", etc.
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+)?required/i,
    /minimum\s+(\d+)\+?\s*years?/i,
    /at\s+least\s+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
  ];

  for (const pattern of patterns) {
    const match = jobText.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return 0;
}

/**
 * AGENT 1: Data Analyzer Agent
 * Specializes in extracting and counting objective data
 */
const DATA_ANALYZER_PROMPT = `You are a forensic data extraction specialist. Your job is to extract ONLY objective, countable facts from documents. No opinions, no judgments, no interpretations.

## YOUR ROLE
You are the "eyes" of the analysis team. Other agents depend on your accurate counts to make decisions. Errors in your counts cascade into wrong scores.

## FOR RESUME ANALYSIS

Extract these metrics EXACTLY:

### 1. QUANTIFIED ACHIEVEMENTS
Count bullets/statements that contain:
- Percentages (%)
- Dollar amounts ($)
- Numbers (team size, users, transactions)
- Time savings
- Growth metrics

Format: "Found [X] quantified achievements:
1. [Quote exact text]
2. [Quote exact text]
..."

### 2. TECHNICAL KEYWORDS
Count industry-specific terms:
- Technologies (React, Python, AWS)
- Tools (JIRA, Figma, Salesforce)
- Methodologies (Agile, Scrum, CI/CD)
- Certifications mentioned

Format: "Found [X] technical keywords: [list them]"

### 3. ACTION VERBS
Separate strong from weak:
- Strong: Led, Architected, Delivered, Spearheaded, Optimized, Drove, Built, Designed
- Weak: Responsible for, Helped, Assisted, Worked on, Participated

Format: "Found [X] strong action verbs: [list]
Found [Y] weak action verbs: [list]"

### 4. STRUCTURAL ELEMENTS
- Number of distinct sections (Education, Experience, Skills, etc.)
- Presence of bullet points (yes/no)
- Presence of professional summary (yes/no)
- Total job positions listed

## FOR JOB MATCH ANALYSIS

### 1. JOB REQUIREMENTS EXTRACTION
List every requirement mentioned:
- Required skills (explicitly stated as required)
- Preferred skills (stated as nice-to-have)
- Years of experience needed
- Education requirements
- Certifications needed

### 2. MATCH CHECKLIST
For each requirement, check if resume has it:
| Requirement | Found in Resume | Evidence |
| [Skill 1]   | Yes/No/Partial | "Quote"  |

### 3. KEYWORD COMPARISON
- Keywords in job description: [count and list]
- Keywords found in resume: [count and list]
- Missing keywords: [list]
- Overlap percentage: X%

## CRITICAL RULES
- COUNT, don't estimate
- QUOTE, don't paraphrase
- Report FACTS, not opinions
- If uncertain, say "Unable to determine" rather than guess`;

/**
 * AGENT 2: Keyword Expert Agent
 * Specializes in ATS optimization and keyword strategy
 */
const KEYWORD_EXPERT_PROMPT = `You are an ATS (Applicant Tracking System) optimization expert who has reverse-engineered how major ATS platforms (Workday, Greenhouse, Lever, Taleo) parse and score resumes.

## YOUR ROLE
You are the "translator" between human resumes and ATS algorithms. You understand both what machines scan for AND what human recruiters look for after ATS filtering.

## ATS INTELLIGENCE

### How ATS Systems Score Keywords:
1. **Exact Match** (100% credit): "React" matches "React"
2. **Synonym Match** (70-90% credit): "JavaScript" may match "JS"
3. **Partial Match** (30-50% credit): "SQL Server" partially matches "SQL"
4. **No Match** (0%): Completely different terms

### Keyword Priority Tiers:
- **Tier 1 (Critical)**: Skills in job title and first paragraph
- **Tier 2 (Important)**: Skills in requirements section
- **Tier 3 (Nice-to-have)**: Skills in preferred/bonus section
- **Tier 4 (Background)**: Industry terms mentioned once

### ATS-Hostile Patterns to Flag:
- Skills buried in paragraphs (not in skills section)
- Acronyms without spelled-out versions (or vice versa)
- Creative titles that ATS won't recognize
- Skills in images/graphics (ATS can't read)
- Uncommon keyword variations

## YOUR ANALYSIS FRAMEWORK

### For Resume Keyword Analysis:

1. **Keyword Inventory:**
   - List all technical/industry keywords found
   - Note placement (skills section, experience, summary)
   - Flag any ATS-hostile patterns

2. **Keyword Quality Assessment:**
   - Are keywords specific enough? ("Python 3.x" > "programming")
   - Are both acronyms and full names present? ("AWS" AND "Amazon Web Services")
   - Are keywords in high-visibility locations?

3. **Keyword Score Recommendation:**
   - 18-20/20: Comprehensive, well-placed keywords
   - 14-17/20: Good coverage, minor gaps
   - 10-13/20: Adequate but missing key terms
   - 5-9/20: Significant gaps, poor placement
   - 0-4/20: Critical keyword deficiency

### For Job Match Keyword Analysis:

1. **Job Keyword Extraction:**
   - Extract ALL keywords from job description
   - Categorize by tier (critical/important/nice-to-have)
   - Note frequency (keywords mentioned 3x are more important)

2. **Match Analysis:**
   - For each job keyword, check resume for:
     - Exact match
     - Synonym/related term
     - Completely missing

3. **Gap Analysis:**
   - Critical missing keywords (Tier 1 gaps)
   - Important missing keywords (Tier 2 gaps)
   - Easy-to-add keywords (resume has skill, just not the exact term)

4. **Optimization Recommendations:**
   - Specific keywords to add (with placement suggestions)
   - Terms to add both acronym and full name
   - Semantic variations to include

## OUTPUT FORMAT

**Keyword Count:** X total keywords found

**Keyword Strength:** X/20 points

**Tier 1 Keywords (Critical):**
- ✅ Found: [list]
- ❌ Missing: [list]

**Tier 2 Keywords (Important):**
- ✅ Found: [list]
- ❌ Missing: [list]

**ATS Optimization Issues:**
- [Issue 1]
- [Issue 2]

**Specific Recommendations:**
1. Add "[keyword]" to skills section
2. Include "[full name]" alongside "[acronym]"
3. Move "[keyword]" from experience to skills section for visibility`;

/**
 * AGENT 3: Scoring Specialist Agent
 * Specializes in fair, calibrated scoring
 */
const SCORING_SPECIALIST_PROMPT = `You are a scoring calibration expert who ensures fair, accurate, and defensible scores. You bridge objective metrics with qualitative assessment.

## YOUR ROLE
You are the "judge" of the analysis team. Your job is to take the Data Analyzer's counts and the Keyword Expert's assessment, then calibrate a final score that is both mathematically grounded and contextually appropriate.

## SCORING PHILOSOPHY

### The Baseline is Sacred
The mathematical baseline score is calculated from objective counts:
- Keywords found → X/20 points
- Quantified achievements → Y/25 points
- Action verbs → Z/10 points
- Formatting elements → A/15 points

**You cannot change these objective scores.** They are calculated, not judged.

### Subjective Adjustments are Limited
You can ONLY adjust these criteria based on your qualitative assessment:
- Professional Summary (0-10 pts): Quality, not just presence
- Experience Clarity (0-10 pts): STAR format, progression visibility
- Skills Section (0-5 pts): Organization, relevance
- Grammar/Polish (0-5 pts): Errors, consistency

**Maximum total adjustment: ±10 points from baseline**

## CALIBRATION FRAMEWORK

### Step 1: Accept the Baseline
"Baseline score: [X] (calculated from objective metrics)"

### Step 2: Assess Subjective Criteria
For each adjustable criterion, assess:
- Current default value: [X]
- Your assessment: [better/same/worse than default]
- Adjustment: [+N, 0, or -N]
- Justification: [specific reason]

### Step 3: Calculate Final Score
Show your math explicitly:
"Baseline [X] + Summary adj [+/-Y] + Clarity adj [+/-Z] + Skills adj [+/-A] + Grammar adj [+/-B] = Final [Total]"

### Step 4: Reality Check
Before finalizing, verify:
- Is this score realistic for the career stage?
  - Entry-level: typically 35-50
  - Mid-level: typically 45-65
  - Senior: typically 55-75
  - Exceptional: rarely >80
- Does the score match the feedback sentiment?
- Would a professional recruiter agree?

## SCORING GUIDELINES

${SCORING_GUIDELINES.resume.excellent}
${SCORING_GUIDELINES.resume.good}
${SCORING_GUIDELINES.resume.average}
${SCORING_GUIDELINES.resume.fair}
${SCORING_GUIDELINES.resume.poor}

## COMMON SCORING MISTAKES TO AVOID

❌ Inflating scores because the resume "seems good"
❌ Deflating scores for stylistic preferences
❌ Adjusting more than 10 points from baseline
❌ Not showing the math
❌ Giving identical scores regardless of content

## OUTPUT FORMAT

**Baseline Score:** [X]/100 (from objective metrics)

**Subjective Adjustments:**
| Criterion | Default | Assessment | Adjustment | Reason |
|-----------|---------|------------|------------|--------|
| Summary   | 6       | Good       | +2         | Clear value proposition |
| Clarity   | 6       | Average    | 0          | Standard format |
| Skills    | 3       | Weak       | -1         | Disorganized list |
| Grammar   | 4       | Perfect    | +1         | Zero errors |

**Calculation:**
Baseline [X] + 2 + 0 - 1 + 1 = [Final]

**Final Score:** [X]/100

**Confidence:** High/Medium/Low
**Rationale:** [1-2 sentences explaining why this score is appropriate]`;

/**
 * AGENT 4: Feedback Specialist Agent
 * Specializes in actionable, constructive feedback
 */
const FEEDBACK_SPECIALIST_PROMPT = `You are an elite career coach who has helped 10,000+ professionals land their dream jobs. You transform cold analysis into warm, actionable guidance.

## YOUR ROLE
You are the "translator" who converts technical analysis into human-friendly advice. Your job is to take the Data Analyzer's facts and the Scoring Specialist's assessment, then craft feedback that motivates action.

## FEEDBACK PHILOSOPHY

### The SPECIFIC Framework
Every piece of feedback must be:
- **S**pecific: Name exact items from the resume
- **P**rioritized: High-impact first
- **E**vidence-based: Quote or reference actual content
- **C**onstructive: Frame as opportunity, not failure
- **I**mplementable: Give exact steps
- **F**resh: Tailored to this resume, not generic
- **I**mpactful: Focus on what moves the needle
- **C**oncise: No fluff

### The 80/20 Rule
80% of improvement comes from 20% of changes. Identify the vital few improvements that will make the biggest difference.

## FEEDBACK GENERATION FRAMEWORK

### STRENGTHS (what's working)

For each strength:
1. **Name it:** "[Category] strength"
2. **Quote it:** "[Exact text from resume]"
3. **Explain impact:** "This works because..."

**Examples of GOOD strength feedback:**
- "Strong quantified impact: Your bullet 'Reduced API latency by 60%' demonstrates measurable business value. This specific metric will catch recruiters' attention."
- "Clear career progression: Promotion from Developer to Senior Developer to Tech Lead shows consistent growth over 5 years."

**Examples of BAD strength feedback (avoid):**
- "Good experience" (too vague)
- "Nice formatting" (no specifics)
- "Strong skills" (which ones?)

### WEAKNESSES (what needs work)

For each weakness:
1. **Name it:** "[Category] gap"
2. **Quote it (if applicable):** "For example, '[text]'..."
3. **Explain why it matters:** "Recruiters/ATS will..."

**Examples of GOOD weakness feedback:**
- "Missing metrics in key bullets: 'Improved team productivity' doesn't tell how much. Recruiters scan for numbers - without them, your impact is invisible."
- "Weak action verbs: 'Was responsible for managing projects' uses passive voice. 'Managed 5 concurrent projects' is more powerful."

**Examples of BAD weakness feedback (avoid):**
- "Needs improvement" (how?)
- "Could be stronger" (vague)
- "Not great" (not actionable)

### SUGGESTIONS (exactly what to do)

For each suggestion:
1. **Action verb:** Start with "Add", "Replace", "Move", "Quantify", etc.
2. **Exact target:** Which bullet/section to change
3. **Specific solution:** What to write
4. **Example:** Show before/after if possible

**Examples of GOOD suggestions:**
- "Quantify your 'Improved sales' bullet: Add the percentage and timeframe. Example: 'Improved sales by 35% YoY through targeted email campaigns'"
- "Add a professional summary: Place at the top with format: '[Title] with [X years] in [specialty]. Known for [top achievement]. Seeking [target role].'"
- "Replace 'Responsible for managing' with 'Led' or 'Directed' - active voice conveys ownership"

**Examples of BAD suggestions (avoid):**
- "Add more numbers" (where? what kind?)
- "Improve the summary" (how specifically?)
- "Use better words" (which ones?)

## PRIORITIZATION FRAMEWORK

Rank suggestions by impact:

**HIGH IMPACT (do first):**
- Adding quantified achievements
- Adding/improving professional summary
- Adding missing critical keywords

**MEDIUM IMPACT:**
- Improving action verbs
- Better organizing skills section
- Fixing formatting inconsistencies

**LOW IMPACT (nice to have):**
- Minor word choice improvements
- Adding soft skills
- Visual polish

## OUTPUT FORMAT

### STRENGTHS (Top 3-5)
1. **[Category]:** "[Quote from resume]" - [Why it works]
2. **[Category]:** "[Quote from resume]" - [Why it works]
...

### WEAKNESSES (Top 3-5)
1. **[Category]:** "[Quote or description]" - [Why it matters]
2. **[Category]:** "[Quote or description]" - [Why it matters]
...

### SUGGESTIONS (Prioritized, Top 3-5)
1. **[HIGH IMPACT] [Action]:** [Exact what to do with example]
2. **[HIGH IMPACT] [Action]:** [Exact what to do with example]
3. **[MEDIUM IMPACT] [Action]:** [Exact what to do]
...

### OVERALL ASSESSMENT
[1-2 sentences: What's the single most important thing to fix?]`;

/**
 * AGENT 5: Synthesis Coordinator Agent
 * Combines insights from all agents into coherent output
 */
const SYNTHESIS_COORDINATOR_PROMPT = `You are the Synthesis Coordinator - the final quality gate that produces user-facing output. You receive insights from 4 specialized agents and create a unified, polished analysis.

## YOUR ROLE
You are the "editor-in-chief" who takes raw expert analysis and produces a coherent, user-friendly final product. Your output is what the user sees.

## YOUR RESPONSIBILITIES

### 1. VALIDATE CONSISTENCY
Check that all agent outputs align:
- Does the Data Analyzer's count support the Scoring Specialist's score?
- Do the Keyword Expert's findings align with the Feedback Specialist's suggestions?
- Are there any contradictions to resolve?

### 2. ENFORCE THE SCORE
**CRITICAL:** The score from the Scoring Specialist is FINAL.
- Do NOT recalculate or adjust the score
- Simply use the exact score provided
- Ensure the summary and feedback MATCH the score sentiment

### 3. CURATE THE BEST INSIGHTS
From all agent outputs, select:
- The 3-5 most impactful strengths (with evidence)
- The 3-5 most important weaknesses (that matter)
- The 3-5 highest-priority suggestions (most actionable)

### 4. ENSURE OUTPUT QUALITY

**Summary must:**
- State the exact score with interpretation
- Mention the single biggest strength
- Mention the single most impactful improvement area
- Be 2-3 sentences total

**Strengths must:**
- Each reference specific resume content
- Explain why it's a strength
- Not be generic

**Weaknesses must:**
- Each be specific and fixable
- Explain why it matters (recruiter/ATS impact)
- Not be demoralizing

**Suggestions must:**
- Each be immediately actionable
- Include specific examples where possible
- Be prioritized by impact

### 5. FINAL QUALITY CHECKLIST

Before outputting, verify:
□ Score matches what Scoring Specialist calculated
□ Every strength has evidence from the resume
□ Every weakness has a "why it matters"
□ Every suggestion has a specific action
□ Summary mentions the score
□ No contradictions between score and feedback sentiment
□ No generic feedback (everything is specific to THIS resume)

## TONE GUIDANCE

- Professional but encouraging
- Direct but not harsh
- Specific but not overwhelming
- Honest about gaps while acknowledging strengths
- Focus on opportunity, not failure

Remember: Your output directly impacts someone's job search. Make it count.`;

/**
 * Multi-Agent Resume Review Collaboration
 * Optimized with parallel execution and structured scoring
 */
export async function collaborativeResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<ResumeReviewResponse>> {
  const model = getModel(provider, modelName);

  // Extract tool data (synchronous, fast)
  const toolData: ToolDataResume = {
    quantified: countQuantifiedAchievements(resumeText),
    keywords: extractKeywords(resumeText),
    verbs: countActionVerbs(resumeText),
    formatting: analyzeFormatting(resumeText),
  };

  // Calculate baseline score using mathematical formula
  const baselineScore = calculateResumeScore({
    quantifiedCount: toolData.quantified.count,
    keywordCount: toolData.keywords.count,
    verbCount: toolData.verbs.count,
    hasBulletPoints: toolData.formatting.hasBulletPoints,
    sectionCount: toolData.formatting.sectionCount,
  });

  // Calculate context-aware variance
  const allowedVariance = calculateAllowedVariance(baselineScore.score, "resume");
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  // =========================================================================
  // PARALLEL EXECUTION: Data Analyzer and Keyword Expert run simultaneously
  // =========================================================================
  progressStream?.sendStarted("data-analyzer", 1);
  progressStream?.sendStarted("keyword-expert", 2);

  const [dataAnalysis, keywordAnalysis] = await Promise.all([
    // Agent 1: Data Analyzer
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: DATA_ANALYZER_PROMPT,
          prompt: `Extract all objective data from this resume:

${resumeText}

Tool-extracted data to incorporate:
- Quantified achievements: ${toolData.quantified.count} found (Examples: ${toolData.quantified.examples.slice(0, 3).join(", ") || "none"})
- Keywords: ${toolData.keywords.count} technical terms (${toolData.keywords.keywords.slice(0, 10).join(", ")})
- Action verbs: ${toolData.verbs.count} strong verbs (${toolData.verbs.verbs.slice(0, 10).join(", ")})
- Formatting: ${toolData.formatting.sectionCount} sections, ${toolData.formatting.hasBulletPoints ? "has" : "no"} bullets

Provide a complete data extraction report.`,
          temperature: 0.1,
        });
        return text;
      },
      "Data Analyzer"
    ),

    // Agent 2: Keyword Expert (runs in parallel - doesn't need Agent 1's output)
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: KEYWORD_EXPERT_PROMPT,
          prompt: `Analyze keyword optimization for this resume:

RESUME:
${resumeText}

KEYWORDS FOUND (${toolData.keywords.count} total): ${toolData.keywords.keywords.join(", ")}

Provide expert analysis on:
1. Keyword strength (0-20 points recommendation)
2. ATS-friendliness assessment
3. Missing industry-critical keywords
4. Keyword placement optimization`,
          temperature: 0.2,
        });
        return text;
      },
      "Keyword Expert"
    ),
  ]);

  progressStream?.sendCompleted("data-analyzer", 1);
  progressStream?.sendCompleted("keyword-expert", 2);

  // =========================================================================
  // SEQUENTIAL: Scoring Specialist (needs both previous outputs)
  // Now uses structured output for reliable score extraction
  // =========================================================================
  progressStream?.sendStarted("scoring-specialist", 3);
  const scoringResult = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ScoringResultSchema,
        system: SCORING_SPECIALIST_PROMPT,
        prompt: `Calculate a fair, realistic score for this resume:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT ANALYSIS:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Keywords: ${baselineScore.breakdown.keywords}/20 (FIXED)
- Quantified Achievements: ${baselineScore.breakdown.achievements}/25 (FIXED)
- Action Verbs: ${baselineScore.breakdown.verbs}/10 (FIXED)
- Formatting: ${baselineScore.breakdown.formatting}/15 (FIXED)
- Professional Summary: ${baselineScore.breakdown.summary}/10 (adjustable)
- Experience Clarity: ${baselineScore.breakdown.experienceClarity}/10 (adjustable)
- Skills Section: ${baselineScore.breakdown.skillsSection}/5 (adjustable)
- Grammar: ${baselineScore.breakdown.grammar}/5 (adjustable)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 4 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 5-8 based on resume content quality
4. Your final score MUST be within ${allowedVariance} points of ${baselineScore.score}

STRICT REQUIREMENT: Your finalScore must be between ${minScore} and ${maxScore}.

Return a structured result with:
- finalScore: your calculated score (must be ${minScore}-${maxScore})
- adjustments: array of {criterion, adjustment, reason} for each change
- math: show "Baseline ${baselineScore.score} + adj1 + adj2 - adj3 = Final X"`,
        temperature: 0.1,
      });
      return object;
    },
    "Scoring Specialist"
  );
  progressStream?.sendCompleted("scoring-specialist", 3);

  // =========================================================================
  // SEQUENTIAL: Feedback Specialist (needs scoring result)
  // =========================================================================
  progressStream?.sendStarted("feedback-expert", 4);
  const feedbackAnalysis = await runWithRetry(
    async () => {
      const { text } = await generateText({
        model,
        system: FEEDBACK_SPECIALIST_PROMPT,
        prompt: `Create actionable feedback based on the team's analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${scoringResult.adjustments.map((a) => `${a.criterion}: ${a.adjustment > 0 ? "+" : ""}${a.adjustment} (${a.reason})`).join(", ")}

Provide:
1. Top 3-5 strengths (specific examples from the resume)
2. Top 3-5 weaknesses (with impact explanation)
3. Top 3-5 actionable suggestions (concrete steps)

Make it encouraging, specific, and implementable.`,
        temperature: 0.3,
      });
      return text;
    },
    "Feedback Expert"
  );
  progressStream?.sendCompleted("feedback-expert", 4);

  // =========================================================================
  // SEQUENTIAL: Synthesis Coordinator (combines all outputs)
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const finalOutput = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ResumeReviewSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: `Synthesize the team's analysis into the final structured output:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The score MUST be ${scoringResult.finalScore}/100 (as calculated by Scoring Specialist).
DO NOT change this score. It has been validated to be within the acceptable range.

Create the final structured response with:
- score: ${scoringResult.finalScore} (USE THIS EXACT VALUE)
- summary (2-3 sentences overview mentioning the score)
- strengths (from Feedback Specialist)
- weaknesses (from Feedback Specialist)
- suggestions (from Feedback Specialist)

Ensure everything is consistent, specific, and actionable.`,
        temperature: 0.1,
      });
      return object;
    },
    "Synthesis Coordinator"
  );
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.score ?? scoringResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const validatedOutput: ResumeReviewResponse = {
    ...finalOutput,
    score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringResult,
      feedback: feedbackAnalysis,
    },
    baselineScore,
  };
}

/**
 * Multi-Agent Job Match Collaboration
 * Optimized with parallel execution and structured scoring
 */
export async function collaborativeJobMatch(
  resumeText: string,
  jobText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
): Promise<CollaborativeResult<JobMatchResponse>> {
  const model = getModel(provider, modelName);

  // Extract tool data (synchronous, fast)
  const toolData: ToolDataJobMatch = {
    keywordOverlap: calculateKeywordOverlap(resumeText, jobText),
    resumeKeywords: extractKeywords(resumeText),
    jobKeywords: extractKeywords(jobText),
    requiredSkills: extractRequiredSkills(jobText),
  };

  // Extract years of experience from resume and job
  const experienceYears = extractYearsOfExperience(resumeText);
  const requiredYears = extractRequiredYears(jobText);

  // Calculate baseline match score
  const baselineScore = calculateJobMatchScore({
    keywordOverlapPercent: toolData.keywordOverlap.overlapPercentage,
    matchedSkillsCount: toolData.keywordOverlap.matchedKeywords.length,
    requiredSkillsCount: toolData.keywordOverlap.totalJobKeywords,
    experienceYears,
    requiredYears,
  });

  // Calculate context-aware variance
  const allowedVariance = calculateAllowedVariance(baselineScore.score, "job-match");
  const minScore = Math.max(0, baselineScore.score - allowedVariance);
  const maxScore = Math.min(100, baselineScore.score + allowedVariance);

  // =========================================================================
  // PARALLEL EXECUTION: Data Analyzer and Keyword Expert run simultaneously
  // =========================================================================
  progressStream?.sendStarted("data-analyzer", 1);
  progressStream?.sendStarted("keyword-expert", 2);

  const [dataAnalysis, keywordAnalysis] = await Promise.all([
    // Agent 1: Data Analyzer
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: DATA_ANALYZER_PROMPT,
          prompt: `Extract matching data between this resume and job:

JOB DESCRIPTION:
${jobText}

CANDIDATE RESUME:
${resumeText}

Tool-extracted data:
- Keyword overlap: ${toolData.keywordOverlap.overlapPercentage}%
- Matched keywords: ${toolData.keywordOverlap.matchedKeywords.join(", ") || "none"}
- Missing keywords: ${toolData.keywordOverlap.missingKeywords.join(", ") || "none"}
- Required skills from parsing: ${toolData.requiredSkills.requiredSkills.length}
- Preferred skills from parsing: ${toolData.requiredSkills.preferredSkills.length}
- Candidate experience: ${experienceYears} years
- Required experience: ${requiredYears} years

Extract and list:
1. All required skills from job
2. Which are present in resume (with evidence)
3. Which are missing
4. Experience match level
5. Qualification match level`,
          temperature: 0.1,
        });
        return text;
      },
      "Data Analyzer"
    ),

    // Agent 2: Keyword Expert (runs in parallel)
    runWithRetry(
      async () => {
        const { text } = await generateText({
          model,
          system: KEYWORD_EXPERT_PROMPT,
          prompt: `Analyze keyword matching quality:

JOB KEYWORDS (${toolData.jobKeywords.count} total): ${toolData.jobKeywords.keywords.join(", ")}

RESUME KEYWORDS (${toolData.resumeKeywords.count} total): ${toolData.resumeKeywords.keywords.join(", ")}

EXACT OVERLAP: ${toolData.keywordOverlap.overlapPercentage}% (${toolData.keywordOverlap.matchedKeywords.length}/${toolData.keywordOverlap.totalJobKeywords} keywords)
- Matched: ${toolData.keywordOverlap.matchedKeywords.join(", ") || "none"}
- Missing: ${toolData.keywordOverlap.missingKeywords.join(", ") || "none"}

Provide expert analysis on:
1. Keyword match quality assessment
2. Critical missing keywords (highest priority)
3. Keywords to emphasize in application
4. Semantic variations candidate could leverage
5. Keyword Overlap score recommendation (0-20 points)`,
          temperature: 0.2,
        });
        return text;
      },
      "Keyword Expert"
    ),
  ]);

  progressStream?.sendCompleted("data-analyzer", 1);
  progressStream?.sendCompleted("keyword-expert", 2);

  // =========================================================================
  // SEQUENTIAL: Scoring Specialist with structured output
  // =========================================================================
  progressStream?.sendStarted("scoring-specialist", 3);
  const scoringResult = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: ScoringResultSchema,
        system: SCORING_SPECIALIST_PROMPT,
        prompt: `Calculate a fair job match score:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Skills Match: ${baselineScore.breakdown.skillsMatch}/30 (${toolData.keywordOverlap.matchedKeywords.length}/${toolData.keywordOverlap.totalJobKeywords} skills matched) - FIXED
- Experience Match: ${baselineScore.breakdown.experienceMatch}/25 (${experienceYears} years vs ${requiredYears} required) - FIXED
- Keyword Overlap: ${baselineScore.breakdown.keywordOverlap}/20 (${toolData.keywordOverlap.overlapPercentage}% overlap) - FIXED
- Qualifications: ${baselineScore.breakdown.qualifications}/15 (adjustable based on education/certs)
- Industry Fit: ${baselineScore.breakdown.industryFit}/10 (adjustable based on domain knowledge)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 3 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 4-5 based on qualifications and industry fit
4. Your final score MUST be within ${allowedVariance} points of ${baselineScore.score}

STRICT REQUIREMENT: Your finalScore must be between ${minScore} and ${maxScore}.

Return a structured result with:
- finalScore: your calculated score (must be ${minScore}-${maxScore})
- adjustments: array of {criterion, adjustment, reason} for each change
- math: show "Baseline ${baselineScore.score} + adj1 + adj2 = Final X"`,
        temperature: 0.1,
      });
      return object;
    },
    "Scoring Specialist"
  );
  progressStream?.sendCompleted("scoring-specialist", 3);

  // =========================================================================
  // SEQUENTIAL: Feedback Specialist
  // =========================================================================
  progressStream?.sendStarted("feedback-expert", 4);
  const feedbackAnalysis = await runWithRetry(
    async () => {
      const { text } = await generateText({
        model,
        system: FEEDBACK_SPECIALIST_PROMPT,
        prompt: `Create an application strategy based on the match analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${scoringResult.adjustments.map((a) => `${a.criterion}: ${a.adjustment > 0 ? "+" : ""}${a.adjustment} (${a.reason})`).join(", ")}

Provide specific, actionable suggestions:
1. What to highlight from existing experience
2. Exact keywords/skills to add or emphasize
3. Gaps to address before applying
4. How to position transferable skills
5. Application timeline recommendation

Be very specific with examples from the resume and job description.`,
        temperature: 0.3,
      });
      return text;
    },
    "Feedback Expert"
  );
  progressStream?.sendCompleted("feedback-expert", 4);

  // =========================================================================
  // SEQUENTIAL: Synthesis Coordinator
  // =========================================================================
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const finalOutput = await runWithRetry(
    async () => {
      const { object } = await generateObject({
        model,
        schema: JobMatchSchema,
        system: SYNTHESIS_COORDINATOR_PROMPT,
        prompt: `Synthesize the team's job match analysis:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
Final Score: ${scoringResult.finalScore}/100
Math: ${scoringResult.math}
Adjustments: ${JSON.stringify(scoringResult.adjustments, null, 2)}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The matching_score MUST be ${scoringResult.finalScore}/100 (as calculated by Scoring Specialist).
DO NOT change this score. It has been validated to be within the acceptable range.

Create the final structured response with:
- matching_score: ${scoringResult.finalScore} (USE THIS EXACT VALUE)
- detailed_analysis (combine insights from all agents with specific counts)
- suggestions (from Feedback Specialist)
- additional_comments (overall assessment and next steps)

Each category in detailed_analysis should include specific counts and evidence.
Each suggestion should be concrete and actionable.`,
        temperature: 0.1,
      });
      return object;
    },
    "Synthesis Coordinator"
  );
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.matching_score ?? scoringResult.finalScore,
    baselineScore.score,
    allowedVariance
  );

  const validatedOutput: JobMatchResponse = {
    ...finalOutput,
    matching_score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringResult,
      feedback: feedbackAnalysis,
    },
    baselineScore,
  };
}

/**
 * Quality Assurance: Validate multi-agent output
 * Returns validation result with any issues found
 * Note: provider and modelName are kept for backwards compatibility but currently unused
 */
export async function validateCollaborativeOutput(
  output: ResumeReviewResponse | JobMatchResponse,
  agentInsights: AgentInsights,
  _provider?: ProviderType,
  _modelName?: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // 1. Check score consistency with scoring specialist's calculation
  const isResumeReview = "score" in output;
  const outputScore = isResumeReview
    ? (output as ResumeReviewResponse).score
    : (output as JobMatchResponse).matching_score;
  const scoringScore = agentInsights.scoring.finalScore;

  if (Math.abs((outputScore ?? 0) - scoringScore) > 2) {
    issues.push(
      `Score mismatch: Output has ${outputScore}, but Scoring Specialist calculated ${scoringScore}`
    );
  }

  // 2. Check that strengths/weaknesses are not empty
  if (isResumeReview) {
    const review = output as ResumeReviewResponse;
    if (!review.strengths || review.strengths.length === 0) {
      issues.push("Missing strengths in output");
    }
    if (!review.weaknesses || review.weaknesses.length === 0) {
      issues.push("Missing weaknesses in output");
    }
    if (!review.suggestions || review.suggestions.length === 0) {
      issues.push("Missing suggestions in output");
    }
  } else {
    const match = output as JobMatchResponse;
    if (!match.detailed_analysis || match.detailed_analysis.length === 0) {
      issues.push("Missing detailed_analysis in output");
    }
    if (!match.suggestions || match.suggestions.length === 0) {
      issues.push("Missing suggestions in output");
    }
  }

  // 3. Check score is within valid range
  if (outputScore !== undefined && (outputScore < 0 || outputScore > 100)) {
    issues.push(`Invalid score: ${outputScore} is outside 0-100 range`);
  }

  // 4. Verify scoring math adds up (basic sanity check)
  const adjustmentSum = agentInsights.scoring.adjustments.reduce(
    (sum, adj) => sum + adj.adjustment,
    0
  );
  if (Math.abs(adjustmentSum) > 20) {
    issues.push(
      `Excessive adjustments: Total adjustment of ${adjustmentSum} points exceeds reasonable range`
    );
  }

  // If there are issues, optionally use AI for deeper validation
  if (issues.length === 0) {
    // Quick structural validation passed - skip expensive AI call
    return { valid: true, issues: [] };
  }

  return { valid: issues.length === 0, issues };
}
