/**
 * Strict Scoring System with Mathematical Constraints
 * Ensures accurate, consistent scoring across all analyses
 */

/**
 * Resume Review Scoring Calculator
 * Returns exact scores based on objective metrics
 */
export function calculateResumeScore(data: {
  quantifiedCount: number;
  keywordCount: number;
  verbCount: number;
  hasBulletPoints: boolean;
  sectionCount: number;
}) {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // 1. Keywords (0-20 points)
  // 0 keywords = 0, 5 keywords = 8, 10 keywords = 14, 15+ keywords = 20
  if (data.keywordCount === 0) {
    breakdown.keywords = 0;
  } else if (data.keywordCount < 5) {
    breakdown.keywords = Math.min(data.keywordCount * 1.6, 8);
  } else if (data.keywordCount < 10) {
    breakdown.keywords = 8 + (data.keywordCount - 5) * 1.2;
  } else if (data.keywordCount < 15) {
    breakdown.keywords = 14 + (data.keywordCount - 10) * 1.2;
  } else {
    breakdown.keywords = 20;
  }

  // 2. Quantified Achievements (0-25 points)
  // 0 achievements = 0, 3 achievements = 10, 6 achievements = 18, 10+ achievements = 25
  if (data.quantifiedCount === 0) {
    breakdown.achievements = 0;
  } else if (data.quantifiedCount < 3) {
    breakdown.achievements = data.quantifiedCount * 3.3;
  } else if (data.quantifiedCount < 6) {
    breakdown.achievements = 10 + (data.quantifiedCount - 3) * 2.7;
  } else if (data.quantifiedCount < 10) {
    breakdown.achievements = 18 + (data.quantifiedCount - 6) * 1.75;
  } else {
    breakdown.achievements = 25;
  }

  // 3. Action Verbs (0-10 points)
  // 0 verbs = 0, 5 verbs = 5, 10 verbs = 8, 15+ verbs = 10
  if (data.verbCount === 0) {
    breakdown.verbs = 0;
  } else if (data.verbCount < 5) {
    breakdown.verbs = data.verbCount;
  } else if (data.verbCount < 10) {
    breakdown.verbs = 5 + (data.verbCount - 5) * 0.6;
  } else if (data.verbCount < 15) {
    breakdown.verbs = 8 + (data.verbCount - 10) * 0.4;
  } else {
    breakdown.verbs = 10;
  }

  // 4. Formatting (0-15 points)
  // Has bullets = 8, No bullets = 3
  // 2 sections = 2, 3-4 sections = 5, 5+ sections = 7
  breakdown.formatting = 0;
  breakdown.formatting += data.hasBulletPoints ? 8 : 3;
  if (data.sectionCount < 3) {
    breakdown.formatting += 2;
  } else if (data.sectionCount < 5) {
    breakdown.formatting += 5;
  } else {
    breakdown.formatting += 7;
  }

  // 5-8. Other criteria require manual assessment (default to middle values)
  // These will be adjusted by the AI based on content
  breakdown.summary = 6; // Default: slightly above average
  breakdown.experienceClarity = 6;
  breakdown.skillsSection = 3;
  breakdown.grammar = 4;

  // Calculate total from breakdown
  score = Math.round(
    breakdown.keywords +
      breakdown.achievements +
      breakdown.verbs +
      breakdown.formatting +
      breakdown.summary +
      breakdown.experienceClarity +
      breakdown.skillsSection +
      breakdown.grammar
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
  };
}

/**
 * Job Match Scoring Calculator
 * Returns exact scores based on objective match metrics
 */
export function calculateJobMatchScore(data: {
  keywordOverlapPercent: number;
  matchedSkillsCount: number;
  requiredSkillsCount: number;
  experienceYears: number;
  requiredYears: number;
}) {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // 1. Skills Match (0-30 points) - MOST IMPORTANT
  // Directly proportional to matched/required ratio
  if (data.requiredSkillsCount === 0) {
    breakdown.skillsMatch = 15; // No specific skills = average score
  } else {
    const matchRatio = data.matchedSkillsCount / data.requiredSkillsCount;
    breakdown.skillsMatch = Math.round(matchRatio * 30);
    // Minimum 5 if at least 1 skill matches
    if (data.matchedSkillsCount > 0 && breakdown.skillsMatch < 5) {
      breakdown.skillsMatch = 5;
    }
  }

  // 2. Experience Match (0-25 points)
  if (data.requiredYears === 0) {
    breakdown.experienceMatch = 15; // No requirement = average
  } else {
    const yearsRatio = data.experienceYears / data.requiredYears;
    if (yearsRatio >= 1.5) {
      // Significantly exceeds = full points
      breakdown.experienceMatch = 25;
    } else if (yearsRatio >= 1.0) {
      // Meets requirement = good score
      breakdown.experienceMatch = 20;
    } else if (yearsRatio >= 0.75) {
      // Close but under = decent score
      breakdown.experienceMatch = 15;
    } else if (yearsRatio >= 0.5) {
      // Half the requirement = fair score
      breakdown.experienceMatch = 10;
    } else {
      // Less than half = low score
      breakdown.experienceMatch = Math.round(yearsRatio * 20);
    }
  }

  // 3. Keyword Overlap (0-20 points)
  // Direct mapping from percentage
  breakdown.keywordOverlap = Math.round(
    (data.keywordOverlapPercent / 100) * 20
  );
  // Minimum 2 if any keywords match
  if (data.keywordOverlapPercent > 0 && breakdown.keywordOverlap < 2) {
    breakdown.keywordOverlap = 2;
  }

  // 4. Qualifications (0-15 points) - Will be adjusted by AI
  // Default to middle value, AI will adjust based on education/certs
  breakdown.qualifications = 8;

  // 5. Industry Fit (0-10 points) - Will be adjusted by AI
  // Default to middle value, AI will adjust based on domain knowledge
  breakdown.industryFit = 5;

  // Calculate total
  score = Math.round(
    breakdown.skillsMatch +
      breakdown.experienceMatch +
      breakdown.keywordOverlap +
      breakdown.qualifications +
      breakdown.industryFit
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
  };
}

/**
 * Validate and constrain a score to realistic ranges
 */
export function validateScore(
  proposedScore: number,
  calculatedScore: number,
  allowedVariance: number = 10
): number {
  // Ensure score is within allowed variance of calculated score
  const minScore = Math.max(0, calculatedScore - allowedVariance);
  const maxScore = Math.min(100, calculatedScore + allowedVariance);

  if (proposedScore < minScore) {
    console.warn(`Score ${proposedScore} too low, adjusting to ${minScore}`);
    return minScore;
  }
  if (proposedScore > maxScore) {
    console.warn(`Score ${proposedScore} too high, adjusting to ${maxScore}`);
    return maxScore;
  }

  return Math.round(proposedScore);
}

/**
 * Calculate context-aware allowed variance based on baseline score
 * Mid-range scores get more variance since subjective factors matter more
 * Extreme scores get tighter variance since they're more objectively determined
 */
export function calculateAllowedVariance(
  baselineScore: number,
  analysisType: "resume" | "job-match"
): number {
  // Mid-range scores (40-60) allow more variance for subjective interpretation
  if (baselineScore >= 40 && baselineScore <= 60) {
    return analysisType === "resume" ? 12 : 15;
  }

  // Slightly above/below average (30-40, 60-70)
  if (
    (baselineScore >= 30 && baselineScore < 40) ||
    (baselineScore > 60 && baselineScore <= 70)
  ) {
    return 10;
  }

  // Extreme scores are more objectively determined, tighter variance
  if (baselineScore < 30 || baselineScore > 80) {
    return 7;
  }

  // Default variance
  return 10;
}

/**
 * Scoring guidelines for AI agents
 */
export const SCORING_GUIDELINES = {
  resume: {
    excellent:
      "85-100: Exceptional resume with 10+ quantified achievements, 15+ keywords, perfect formatting",
    good: "70-84: Strong resume with 6-9 achievements, 10-14 keywords, good formatting",
    average:
      "50-69: Decent resume with 3-5 achievements, 5-9 keywords, acceptable formatting",
    fair: "35-49: Weak resume with 1-2 achievements, few keywords, poor formatting",
    poor: "0-34: Very weak resume with no achievements, minimal keywords, bad formatting",
  },
  jobMatch: {
    excellent:
      "85-100: 90%+ skills match, exceeds experience requirement, 80%+ keyword overlap",
    good: "70-84: 70-89% skills match, meets experience requirement, 60-79% keyword overlap",
    average:
      "50-69: 50-69% skills match, 75%+ experience requirement, 40-59% keyword overlap",
    fair: "35-49: 30-49% skills match, 50-74% experience requirement, 20-39% keyword overlap",
    poor: "0-34: <30% skills match, <50% experience requirement, <20% keyword overlap",
  },
};
