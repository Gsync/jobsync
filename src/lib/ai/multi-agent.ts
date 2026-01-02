/**
 * Multi-Agent Collaboration System
 * Phase 3: Multiple specialized agents collaborate for superior analysis
 *
 * Architecture:
 * User Request → Coordinator → [Analyzer, Keyword Expert, Scoring Expert] → Synthesizer → Final Output
 */

import { generateObject, generateText } from "ai";
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
  SCORING_GUIDELINES,
} from "./scoring";

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
const DATA_ANALYZER_PROMPT = `You are a data extraction specialist. Your only job is to analyze text and extract objective, measurable data.

For RESUME analysis, extract:
- Total number of job positions
- Total years of experience
- Number of quantified achievements (with numbers/%)
- Number of technical skills listed
- Number of action verbs used
- Formatting elements (bullets, sections, spacing)

For JOB MATCH analysis, extract:
- Required skills list (from job description)
- Required experience (years, level)
- Matched skills (present in resume)
- Missing skills (not in resume)
- Keyword overlap percentage

Respond with only factual data, no opinions or judgments.`;

/**
 * AGENT 2: Keyword Expert Agent
 * Specializes in ATS optimization and keyword strategy
 */
const KEYWORD_EXPERT_PROMPT = `You are an ATS (Applicant Tracking System) keyword optimization expert.

Your expertise:
- Identifying critical industry keywords
- Analyzing keyword density and placement
- Recognizing ATS-friendly vs ATS-hostile terms
- Understanding semantic keyword variations
- Keyword stuffing detection

For resumes: Identify keyword strengths, gaps, and optimization opportunities.
For job matches: Calculate precise keyword overlap and recommend specific additions.

Provide expert analysis on keyword optimization only.`;

/**
 * AGENT 3: Scoring Specialist Agent
 * Specializes in fair, calibrated scoring
 */
const SCORING_SPECIALIST_PROMPT = `You are a scoring calibration expert. Your role is to assign fair, realistic scores based on MATHEMATICAL CALCULATIONS.

CRITICAL RULES:
1. You MUST use the baseline score provided from the mathematical calculator
2. You can adjust UP or DOWN by maximum 10 points based on qualitative factors
3. You MUST show your exact math: baseline ± adjustments = final score
4. You MUST explain every adjustment you make

Your process:
1. Start with the CALCULATED BASELINE SCORE (this is mathematically derived from objective data)
2. Review subjective quality factors (clarity, grammar, presentation)
3. Make small adjustments (+/- 10 points max) for these factors
4. Show clear math: Baseline X + adjustment Y = Final Z
5. Justify every adjustment point by point

SCORING CONSTRAINTS:
- NEVER give a score more than 10 points different from the baseline
- Most adjustments should be ±5 points or less
- Only give ±10 points for exceptional or terrible subjective factors
- Show your work: "Baseline 67 + 5 (excellent clarity) - 2 (minor grammar) = 70"

Scoring reality check:
${SCORING_GUIDELINES.resume.excellent}
${SCORING_GUIDELINES.resume.good}
${SCORING_GUIDELINES.resume.average}
${SCORING_GUIDELINES.resume.fair}
${SCORING_GUIDELINES.resume.poor}

You are the authority on scoring accuracy - but you must respect the mathematical baseline.`;

/**
 * AGENT 4: Feedback Specialist Agent
 * Specializes in actionable, constructive feedback
 */
const FEEDBACK_SPECIALIST_PROMPT = `You are a career coach and feedback expert. Your role is to transform analysis into actionable recommendations.

Your expertise:
- Translating weaknesses into growth opportunities
- Providing specific, implementable suggestions
- Balancing encouragement with honesty
- Prioritizing high-impact improvements
- Using concrete examples

Feedback principles:
- Be specific: "Add 'Managed $2M budget'" not "add numbers"
- Be actionable: Give exact steps to improve
- Be encouraging: Frame as opportunities, not failures
- Be prioritized: Most important improvements first

Transform raw analysis into inspiring, helpful guidance.`;

/**
 * AGENT 5: Synthesis Coordinator Agent
 * Combines insights from all agents into coherent output
 */
const SYNTHESIS_COORDINATOR_PROMPT = `You are the synthesis coordinator. You receive input from 4 specialized agents and create a unified, coherent analysis.

Your responsibilities:
1. Validate consistency across agent outputs
2. Resolve any conflicting perspectives
3. Ensure the final score reflects all insights
4. Combine strengths/weaknesses from multiple viewpoints
5. Synthesize suggestions into prioritized action plan

Quality checks:
- Does the score match the feedback sentiment?
- Are suggestions addressing identified weaknesses?
- Is the analysis specific and evidence-based?
- Is the output user-friendly and actionable?

Create the final structured output that represents the collective wisdom of the agent team.`;

/**
 * Multi-Agent Resume Review Collaboration
 */
export async function collaborativeResumeReview(
  resumeText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
) {
  const model = getModel(provider, modelName);

  // STEP 1: Data Analyzer extracts objective metrics
  progressStream?.sendStarted("data-analyzer", 1);
  const toolData = {
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

  const { text: dataAnalysis } = await generateText({
    model,
    system: DATA_ANALYZER_PROMPT,
    prompt: `Extract all objective data from this resume:

${resumeText}

Tool-extracted data to incorporate:
- Quantified achievements: ${toolData.quantified.count} found
- Keywords: ${toolData.keywords.count} technical terms
- Action verbs: ${toolData.verbs.count} strong verbs
- Formatting: ${toolData.formatting.sectionCount} sections, ${
      toolData.formatting.hasBulletPoints ? "has" : "no"
    } bullets

Provide a complete data extraction report.`,
    temperature: 0.1,
  });
  progressStream?.sendCompleted("data-analyzer", 1);

  // STEP 2: Keyword Expert analyzes ATS optimization
  progressStream?.sendStarted("keyword-expert", 2);
  const { text: keywordAnalysis } = await generateText({
    model,
    system: KEYWORD_EXPERT_PROMPT,
    prompt: `Analyze keyword optimization for this resume:

RESUME:
${resumeText}

DATA ANALYZER'S FINDINGS:
${dataAnalysis}

KEYWORDS FOUND: ${toolData.keywords.keywords.join(", ")}

Provide expert analysis on:
1. Keyword strength (0-20 points recommendation)
2. ATS-friendliness assessment
3. Missing industry-critical keywords
4. Keyword placement optimization`,
    temperature: 0.2,
  });
  progressStream?.sendCompleted("keyword-expert", 2);

  // STEP 3: Scoring Specialist calculates fair scores
  progressStream?.sendStarted("scoring-specialist", 3);
  const { text: scoringAnalysis } = await generateText({
    model,
    system: SCORING_SPECIALIST_PROMPT,
    prompt: `Calculate a fair, realistic score for this resume:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT ANALYSIS:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Keywords: ${baselineScore.breakdown.keywords}/20
- Quantified Achievements: ${baselineScore.breakdown.achievements}/25
- Action Verbs: ${baselineScore.breakdown.verbs}/10
- Formatting: ${baselineScore.breakdown.formatting}/15
- Professional Summary: ${
      baselineScore.breakdown.summary
    }/10 (default, adjust as needed)
- Experience Clarity: ${
      baselineScore.breakdown.experienceClarity
    }/10 (default, adjust as needed)
- Skills Section: ${
      baselineScore.breakdown.skillsSection
    }/5 (default, adjust as needed)
- Grammar: ${baselineScore.breakdown.grammar}/5 (default, adjust as needed)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 4 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 5-8 based on resume content quality
4. Your final score MUST be within 10 points of ${baselineScore.score}
5. Show your math: ${baselineScore.score} + adjustments = final score

STRICT REQUIREMENT: Your final score must be between ${Math.max(
      0,
      baselineScore.score - 10
    )} and ${Math.min(100, baselineScore.score + 10)}.

Show your math for each criterion and calculate the total (0-100).`,
    temperature: 0.1,
  });
  progressStream?.sendCompleted("scoring-specialist", 3);

  // STEP 4: Feedback Specialist creates actionable suggestions
  progressStream?.sendStarted("feedback-expert", 4);
  const { text: feedbackAnalysis } = await generateText({
    model,
    system: FEEDBACK_SPECIALIST_PROMPT,
    prompt: `Create actionable feedback based on the team's analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
${scoringAnalysis}

Provide:
1. Top 3-5 strengths (specific examples)
2. Top 3-5 weaknesses (with impact explanation)
3. Top 3-5 actionable suggestions (concrete steps)

Make it encouraging, specific, and implementable.`,
    temperature: 0.3,
  });
  progressStream?.sendCompleted("feedback-expert", 4);

  // STEP 5: Synthesis Coordinator creates final structured output
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const { object: finalOutput } = await generateObject({
    model,
    schema: ResumeReviewSchema,
    system: SYNTHESIS_COORDINATOR_PROMPT,
    prompt: `Synthesize the team's analysis into the final structured output:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
${scoringAnalysis}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The final score MUST be based on the Scoring Specialist's calculation, which is constrained to ${Math.max(
      0,
      baselineScore.score - 10
    )}-${Math.min(100, baselineScore.score + 10)}.
Extract the exact final score from the Scoring Specialist's analysis.

Create the final structured response with:
- score (MUST match Scoring Specialist's final calculation)
- summary (2-3 sentences overview)
- strengths (from Feedback Specialist)
- weaknesses (from Feedback Specialist)
- suggestions (from Feedback Specialist)

Ensure everything is consistent, specific, and actionable.`,
    temperature: 0.1, // Lower temperature for more deterministic scoring
  });
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.score || baselineScore.score,
    baselineScore.score,
    10
  );

  const validatedOutput = {
    ...finalOutput,
    score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringAnalysis,
      feedback: feedbackAnalysis,
    },
  };
}

/**
 * Multi-Agent Job Match Collaboration
 */
export async function collaborativeJobMatch(
  resumeText: string,
  jobText: string,
  provider: ProviderType,
  modelName: string,
  progressStream?: ProgressStream
) {
  const model = getModel(provider, modelName);

  // STEP 1: Data Analyzer extracts requirements and matches
  progressStream?.sendStarted("data-analyzer", 1);
  const toolData = {
    keywordOverlap: calculateKeywordOverlap(resumeText, jobText),
    resumeKeywords: extractKeywords(resumeText),
    jobKeywords: extractKeywords(jobText),
    requiredSkills: extractRequiredSkills(jobText),
  };

  // Extract years of experience from resume and job (simple heuristic)
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

  const { text: dataAnalysis } = await generateText({
    model,
    system: DATA_ANALYZER_PROMPT,
    prompt: `Extract matching data between this resume and job:

JOB DESCRIPTION:
${jobText}

CANDIDATE RESUME:
${resumeText}

Tool-extracted data:
- Keyword overlap: ${toolData.keywordOverlap.overlapPercentage}%
- Matched keywords: ${toolData.keywordOverlap.matchedKeywords.join(", ")}
- Missing keywords: ${toolData.keywordOverlap.missingKeywords.join(", ")}
- Required skills: ${toolData.requiredSkills.requiredSkills.length}
- Preferred skills: ${toolData.requiredSkills.preferredSkills.length}

Extract and list:
1. All required skills from job
2. Which are present in resume (with evidence)
3. Which are missing
4. Experience match level
5. Qualification match level`,
    temperature: 0.1,
  });
  progressStream?.sendCompleted("data-analyzer", 1);

  // STEP 2: Keyword Expert analyzes match quality
  progressStream?.sendStarted("keyword-expert", 2);
  const { text: keywordAnalysis } = await generateText({
    model,
    system: KEYWORD_EXPERT_PROMPT,
    prompt: `Analyze keyword matching quality:

DATA ANALYZER'S FINDINGS:
${dataAnalysis}

EXACT OVERLAP: ${toolData.keywordOverlap.overlapPercentage}% (${toolData.keywordOverlap.matchedKeywords.length}/${toolData.keywordOverlap.totalJobKeywords} keywords)

Provide expert analysis on:
1. Keyword match quality assessment
2. Critical missing keywords (highest priority)
3. Keywords to emphasize in application
4. Semantic variations candidate could leverage
5. Keyword Overlap score recommendation (0-20 points)`,
    temperature: 0.2,
  });
  progressStream?.sendCompleted("keyword-expert", 2);

  // STEP 3: Scoring Specialist calculates match score
  progressStream?.sendStarted("scoring-specialist", 3);
  const { text: scoringAnalysis } = await generateText({
    model,
    system: SCORING_SPECIALIST_PROMPT,
    prompt: `Calculate a fair job match score:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

BASELINE BREAKDOWN (mathematically calculated):
- Skills Match: ${baselineScore.breakdown.skillsMatch}/30 (${
      toolData.keywordOverlap.matchedKeywords.length
    }/${toolData.keywordOverlap.totalJobKeywords} skills matched)
- Experience Match: ${
      baselineScore.breakdown.experienceMatch
    }/25 (${experienceYears} years vs ${requiredYears} required)
- Keyword Overlap: ${baselineScore.breakdown.keywordOverlap}/20 (${
      toolData.keywordOverlap.overlapPercentage
    }% overlap)
- Qualifications: ${
      baselineScore.breakdown.qualifications
    }/15 (default, adjust based on education/certs)
- Industry Fit: ${
      baselineScore.breakdown.industryFit
    }/10 (default, adjust based on domain knowledge)

YOUR TASK:
1. Review the baseline score of ${baselineScore.score}/100
2. The first 3 criteria are FIXED (based on objective counts)
3. You can ONLY adjust criteria 4-5 based on qualifications and industry fit
4. Your final score MUST be within 10 points of ${baselineScore.score}
5. Show your math: ${baselineScore.score} + adjustments = final score

STRICT REQUIREMENT: Your final score must be between ${Math.max(
      0,
      baselineScore.score - 10
    )} and ${Math.min(100, baselineScore.score + 10)}.

Show exact math for each adjustment.`,
    temperature: 0.1,
  });
  progressStream?.sendCompleted("scoring-specialist", 3);

  // STEP 4: Feedback Specialist creates application strategy
  progressStream?.sendStarted("feedback-expert", 4);
  const { text: feedbackAnalysis } = await generateText({
    model,
    system: FEEDBACK_SPECIALIST_PROMPT,
    prompt: `Create an application strategy based on the match analysis:

DATA FINDINGS:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
${scoringAnalysis}

Provide specific, actionable suggestions:
1. What to highlight from existing experience
2. Exact keywords/skills to add or emphasize
3. Gaps to address before applying
4. How to position transferable skills
5. Application timeline recommendation

Be very specific with examples from the resume and job description.`,
    temperature: 0.3,
  });
  progressStream?.sendCompleted("feedback-expert", 4);

  // STEP 5: Synthesis Coordinator creates final output
  progressStream?.sendStarted("synthesis-coordinator", 5);
  const { object: finalOutput } = await generateObject({
    model,
    schema: JobMatchSchema,
    system: SYNTHESIS_COORDINATOR_PROMPT,
    prompt: `Synthesize the team's job match analysis:

DATA ANALYZER:
${dataAnalysis}

KEYWORD EXPERT:
${keywordAnalysis}

SCORING SPECIALIST:
${scoringAnalysis}

FEEDBACK SPECIALIST:
${feedbackAnalysis}

CALCULATED BASELINE SCORE: ${baselineScore.score}/100

CRITICAL SCORING RULE:
The final matching_score MUST be based on the Scoring Specialist's calculation, which is constrained to ${Math.max(
      0,
      baselineScore.score - 10
    )}-${Math.min(100, baselineScore.score + 10)}.
Extract the exact final score from the Scoring Specialist's analysis.

Create the final structured response with:
- matching_score (MUST match Scoring Specialist's final calculation)
- detailed_analysis (combine insights from all agents with specific counts)
- suggestions (from Feedback Specialist)
- additional_comments (overall assessment and next steps)

Each category in detailed_analysis should include specific counts and evidence.
Each suggestion should be concrete and actionable.`,
    temperature: 0.1, // Lower temperature for more deterministic scoring
  });
  progressStream?.sendCompleted("synthesis-coordinator", 5);

  // VALIDATE: Ensure score is within acceptable range
  const validatedScore = validateScore(
    finalOutput.matching_score || baselineScore.score,
    baselineScore.score,
    10
  );

  const validatedOutput = {
    ...finalOutput,
    matching_score: validatedScore,
  };

  return {
    analysis: validatedOutput,
    agentInsights: {
      data: dataAnalysis,
      keywords: keywordAnalysis,
      scoring: scoringAnalysis,
      feedback: feedbackAnalysis,
    },
  };
}

/**
 * Quality Assurance: Validate multi-agent output
 */
export async function validateCollaborativeOutput(
  output: any,
  agentInsights: any,
  provider: ProviderType,
  modelName: string
): Promise<{ valid: boolean; issues: string[] }> {
  const model = getModel(provider, modelName);

  const { text: validation } = await generateText({
    model,
    system: `You are a quality assurance validator. Check if the multi-agent output is consistent, accurate, and high-quality.

Validation checklist:
1. Score matches the scoring specialist's calculation
2. Feedback aligns with identified weaknesses
3. Suggestions are specific and actionable
4. No contradictions between agents
5. Evidence-based conclusions

Return "VALID" if all checks pass, or list specific issues.`,
    prompt: `Validate this multi-agent output:

FINAL OUTPUT:
${JSON.stringify(output, null, 2)}

AGENT INSIGHTS:
${JSON.stringify(agentInsights, null, 2)}

Check for consistency, accuracy, and quality.`,
    temperature: 0.1,
  });

  const valid = validation.includes("VALID");
  const issues = valid
    ? []
    : validation
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().substring(1).trim());

  return { valid, issues };
}
