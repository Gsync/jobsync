/**
 * AI Analysis Tools - Provide accurate counting and extraction functions
 * These tools give agents the ability to perform precise analysis programmatically
 */

/**
 * Extract and count quantified achievements (numbers, percentages, metrics)
 */
export function countQuantifiedAchievements(text: string): {
  count: number;
  examples: string[];
} {
  // Match patterns like: "40%", "$2M", "5+ years", "Increased by 50%"
  const patterns = [
    /\d+%/g, // Percentages: 40%
    /\$[\d,]+[KMB]?/g, // Money: $2M, $500K
    /\d+\+?\s*(years?|months?|weeks?)/gi, // Time: 5+ years
    /(increased|decreased|improved|reduced|grew|boosted)\s+by\s+\d+/gi, // Actions with numbers
    /\d+x\s+(faster|better|more)/gi, // Multipliers: 2x faster
    /team\s+of\s+\d+/gi, // Team size: team of 12
    /\d+\s+(clients?|customers?|users?|projects?)/gi, // Quantities
  ];

  const matches = new Set<string>();
  patterns.forEach((pattern) => {
    const found = text.match(pattern);
    if (found) {
      found.forEach((m) => matches.add(m));
    }
  });

  const examples = Array.from(matches).slice(0, 5); // Top 5 examples
  return { count: matches.size, examples };
}

/**
 * Extract technical keywords and skills
 */
export function extractKeywords(text: string): {
  keywords: string[];
  count: number;
} {
  // Common tech keywords, frameworks, methodologies
  const techTerms = [
    // Programming languages
    "javascript",
    "typescript",
    "python",
    "java",
    "c#",
    "ruby",
    "go",
    "rust",
    "php",
    "swift",
    "kotlin",
    // Frameworks
    "react",
    "angular",
    "vue",
    "node",
    "express",
    "django",
    "flask",
    "spring",
    "rails",
    ".net",
    "next.js",
    // Cloud/DevOps
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "ci/cd",
    "jenkins",
    "terraform",
    // Databases
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "dynamodb",
    // Methodologies
    "agile",
    "scrum",
    "kanban",
    "tdd",
    "ci/cd",
    // Other
    "api",
    "rest",
    "graphql",
    "microservices",
    "machine learning",
    "ai",
    "data analysis",
  ];

  const lowerText = text.toLowerCase();
  const foundKeywords = techTerms.filter((term) =>
    lowerText.includes(term.toLowerCase())
  );

  return {
    keywords: foundKeywords,
    count: foundKeywords.length,
  };
}

/**
 * Count strong action verbs in resume
 */
export function countActionVerbs(text: string): {
  count: number;
  verbs: string[];
} {
  const strongVerbs = [
    "led",
    "managed",
    "created",
    "developed",
    "implemented",
    "designed",
    "built",
    "launched",
    "achieved",
    "improved",
    "increased",
    "decreased",
    "reduced",
    "optimized",
    "streamlined",
    "spearheaded",
    "pioneered",
    "established",
    "orchestrated",
    "drove",
    "delivered",
    "executed",
    "transformed",
    "accelerated",
    "generated",
  ];

  const lowerText = text.toLowerCase();
  const foundVerbs = strongVerbs.filter((verb) =>
    lowerText.includes(verb.toLowerCase())
  );

  return {
    count: foundVerbs.length,
    verbs: foundVerbs,
  };
}

/**
 * Calculate keyword overlap between resume and job description
 */
export function calculateKeywordOverlap(
  resumeText: string,
  jobText: string
): {
  overlapPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalJobKeywords: number;
} {
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobText);

  // Check which job keywords appear in resume
  const lowerResume = resumeText.toLowerCase();
  const matchedKeywords = jobKeywords.keywords.filter((keyword) =>
    lowerResume.includes(keyword.toLowerCase())
  );

  const missingKeywords = jobKeywords.keywords.filter(
    (keyword) => !lowerResume.includes(keyword.toLowerCase())
  );

  const overlapPercentage =
    jobKeywords.count > 0
      ? (matchedKeywords.length / jobKeywords.count) * 100
      : 0;

  return {
    overlapPercentage: Math.round(overlapPercentage),
    matchedKeywords,
    missingKeywords,
    totalJobKeywords: jobKeywords.count,
  };
}

/**
 * Analyze text structure and formatting quality
 */
export function analyzeFormatting(text: string): {
  hasBulletPoints: boolean;
  hasConsistentSpacing: boolean;
  averageLineLength: number;
  sectionCount: number;
} {
  const lines = text.split("\n");
  const bulletLines = lines.filter(
    (line) =>
      line.trim().startsWith("•") ||
      line.trim().startsWith("-") ||
      line.trim().startsWith("*")
  );

  const hasBulletPoints = bulletLines.length > 3;

  // Count potential sections (all caps lines or lines ending with :)
  const sectionHeaders = lines.filter(
    (line) =>
      (line.trim().length > 0 && line === line.toUpperCase()) ||
      line.trim().endsWith(":")
  );

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const averageLineLength =
    nonEmptyLines.reduce((sum, line) => sum + line.length, 0) /
    Math.max(nonEmptyLines.length, 1);

  return {
    hasBulletPoints,
    hasConsistentSpacing: averageLineLength > 20 && averageLineLength < 100,
    averageLineLength: Math.round(averageLineLength),
    sectionCount: sectionHeaders.length,
  };
}

/**
 * Extract and count required skills from job description
 */
export function extractRequiredSkills(jobText: string): {
  requiredSkills: string[];
  preferredSkills: string[];
  totalSkills: number;
} {
  const required: string[] = [];
  const preferred: string[] = [];

  // Look for sections mentioning required/preferred
  const lines = jobText.split("\n");
  let inRequiredSection = false;
  let inPreferredSection = false;

  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();

    if (
      lowerLine.includes("required") ||
      lowerLine.includes("must have") ||
      lowerLine.includes("qualifications")
    ) {
      inRequiredSection = true;
      inPreferredSection = false;
    } else if (
      lowerLine.includes("preferred") ||
      lowerLine.includes("nice to have") ||
      lowerLine.includes("bonus")
    ) {
      inPreferredSection = true;
      inRequiredSection = false;
    }

    // Extract skills from bullet points
    if (
      (line.trim().startsWith("-") ||
        line.trim().startsWith("•") ||
        line.trim().startsWith("*")) &&
      line.length < 150
    ) {
      const skill = line.trim().substring(1).trim();
      if (inRequiredSection && skill) {
        required.push(skill);
      } else if (inPreferredSection && skill) {
        preferred.push(skill);
      }
    }
  });

  return {
    requiredSkills: required,
    preferredSkills: preferred,
    totalSkills: required.length + preferred.length,
  };
}
