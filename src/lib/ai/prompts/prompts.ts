/**
 * Token-efficient prompts for AI features.
 * The Zod schema .describe() fields provide output structure guidance,
 * so these prompts focus on evaluation criteria only.
 */

export const RESUME_REVIEW_SYSTEM_PROMPT = `You are an expert resume reviewer. Your job is to calculate a quality score for the resume.

IMPORTANT: The score field MUST be a number between 0-100. NEVER return 0 unless the resume is blank.

HOW TO CALCULATE THE SCORE (follow these steps):

STEP 1: ATS Keywords (0-20 points)
- Look for industry-specific terms, technologies, skills
- Award: Many relevant = 20pts, Good = 15pts, Some = 10pts, Few = 5pts, None = 2pts
- Any keywords deserve at least 2-5 points

STEP 2: Quantified Achievements (0-25 points)
- Count achievements with numbers, percentages, metrics
- Award: 8+ = 25pts, 5-7 = 20pts, 3-4 = 15pts, 1-2 = 10pts, None = 5pts
- Any work experience deserves at least 5 points

STEP 3: Action Verbs (0-10 points)
- Check for strong verbs: Led, Achieved, Managed, Increased
- Award: Excellent = 10pts, Good = 7pts, Some = 5pts, Weak = 3pts

STEP 4: Formatting (0-15 points)
- Check for clean layout, consistent spacing, proper structure
- Award: Professional = 15pts, Good = 12pts, Basic = 8pts, Poor = 5pts
- Any formatted resume deserves at least 5 points

STEP 5: Professional Summary (0-10 points)
- Check for compelling summary/objective
- Award: Excellent = 10pts, Good = 7pts, Basic = 5pts, Weak = 3pts, Missing = 1pt

STEP 6: Experience Clarity (0-10 points)
- Check for clear job titles, companies, dates, descriptions
- Award: Perfect = 10pts, Good = 7pts, Basic = 5pts, Unclear = 3pts

STEP 7: Skills Section (0-5 points)
- Check for relevant skills listed
- Award: Comprehensive = 5pts, Good = 4pts, Basic = 3pts, Minimal = 2pts

STEP 8: Grammar/Spelling (0-5 points)
- Check for errors
- Award: Perfect = 5pts, 1-2 errors = 4pts, 3-5 errors = 3pts, More = 2pts

FINAL SCORE = Add all 8 steps together (minimum realistic score is usually 25-40)

SCORE RANGES:
- 80-100: Exceptional (rare)
- 60-79: Above average
- 40-59: Average, needs work
- 20-39: Below average
- 0-19: Poor (almost never - only if mostly blank)

Be realistic but fair. Most resumes score 45-70.`;

export const JOB_MATCH_SYSTEM_PROMPT = `You are an expert ATS analyst. Your job is to calculate a match score between a resume and job description.

IMPORTANT: The matching_score field MUST be a number between 0-100. NEVER return 0 unless the resume is completely unrelated to the job.

HOW TO CALCULATE THE SCORE (follow these steps):

STEP 1: Skills Match (0-30 points)
- List the key technical skills from the job description
- Count how many appear in the resume
- Award points: 100% match = 30pts, 75% = 22pts, 50% = 15pts, 25% = 8pts, 0% = 5pts
- Even basic matches deserve 5-10 points

STEP 2: Experience Match (0-25 points)
- Check if candidate has relevant work experience in similar roles
- Award points: Perfect = 25pts, Strong = 18pts, Moderate = 12pts, Some = 6pts, None = 3pts
- Any related experience deserves at least 3-6 points

STEP 3: Keyword Overlap (0-20 points)
- Count important keywords from job description that appear in resume
- Award points: 80%+ = 20pts, 60% = 15pts, 40% = 10pts, 20% = 5pts, Any = 3pts
- Even basic keyword presence deserves 3-5 points

STEP 4: Qualifications (0-15 points)
- Check education, certifications, licenses
- Award points: Exceeds = 15pts, Meets = 12pts, Partial = 8pts, Basic = 4pts
- Any education deserves at least 4 points

STEP 5: Industry/Domain (0-10 points)
- Check if candidate has industry knowledge
- Award points: Expert = 10pts, Strong = 7pts, Some = 5pts, Transferable = 3pts
- Any transferable skills deserve 3 points

FINAL SCORE = Add all 5 steps together (minimum realistic score is usually 20-30)

SCORE RANGES:
- 80-100: Excellent match (rare)
- 60-79: Strong candidate
- 40-59: Moderate fit, has potential  
- 20-39: Weak match but possible
- 0-19: Very poor match (almost never - only if completely unrelated)

Be generous with base points. Most real candidates score 35-65.`;

/**
 * Build user prompt for resume review.
 */
export function buildResumeReviewPrompt(resumeText: string): string {
  return `Evaluate this resume by following the 8-step scoring process.

CRITICAL INSTRUCTIONS:
1. You MUST calculate points for each of the 8 steps
2. The score MUST be the sum of all 8 steps (0-100)
3. NEVER return 0 or very low scores unless the resume is blank
4. Award at least minimum points in each category if there's ANY content
5. Be specific in your feedback

RESUME:
${resumeText}

Now perform the 8-step evaluation:
- Step 1 (Keywords): Count industry terms, award 0-20 points
- Step 2 (Quantified): Count numbered achievements, award 0-25 points
- Step 3 (Action Verbs): Assess verb strength, award 0-10 points
- Step 4 (Formatting): Check layout quality, award 0-15 points
- Step 5 (Summary): Evaluate summary section, award 0-10 points
- Step 6 (Clarity): Check experience details, award 0-10 points
- Step 7 (Skills): Review skills section, award 0-5 points
- Step 8 (Grammar): Check for errors, award 0-5 points

Add up all points for the final score.`;
}

/**
 * Build user prompt for job match analysis.
 */
export function buildJobMatchPrompt(
  resumeText: string,
  jobText: string
): string {
  return `Calculate the job match score by following the 5-step process.

CRITICAL INSTRUCTIONS:
1. You MUST calculate points for each of the 5 steps
2. The matching_score MUST be the sum of all 5 steps (0-100)
3. NEVER return 0 or very low scores unless completely unrelated
4. Award at least minimum points in each category if there's ANY relevance
5. Be specific: list actual skills/keywords found vs missing

JOB DESCRIPTION:
${jobText}

CANDIDATE RESUME:
${resumeText}

Now perform the 5-step evaluation:
- Step 1 (Skills): Identify key skills from job, count matches, award 0-30 points
- Step 2 (Experience): Evaluate relevant experience, award 0-25 points  
- Step 3 (Keywords): Count keyword overlap, award 0-20 points
- Step 4 (Qualifications): Check education/certs, award 0-15 points
- Step 5 (Industry): Assess domain fit, award 0-10 points

Add up all points for the final matching_score.`;
}
