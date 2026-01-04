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

// ============================================================================
// DOMAIN-SPECIFIC KEYWORD SETS
// ============================================================================

const TECH_KEYWORDS = [
  // Programming languages
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  "c++",
  "ruby",
  "go",
  "golang",
  "rust",
  "php",
  "swift",
  "kotlin",
  "scala",
  "r",
  "matlab",
  "perl",
  "bash",
  "shell",
  "powershell",
  // Frontend
  "react",
  "angular",
  "vue",
  "svelte",
  "next.js",
  "nextjs",
  "nuxt",
  "gatsby",
  "webpack",
  "vite",
  "tailwind",
  "css",
  "sass",
  "less",
  "html",
  "redux",
  "mobx",
  "zustand",
  // Backend
  "node",
  "nodejs",
  "express",
  "fastify",
  "nestjs",
  "django",
  "flask",
  "fastapi",
  "spring",
  "spring boot",
  "rails",
  "ruby on rails",
  ".net",
  "asp.net",
  "laravel",
  // Cloud/DevOps
  "aws",
  "amazon web services",
  "azure",
  "gcp",
  "google cloud",
  "docker",
  "kubernetes",
  "k8s",
  "ci/cd",
  "jenkins",
  "github actions",
  "gitlab ci",
  "terraform",
  "ansible",
  "puppet",
  "chef",
  "cloudformation",
  "helm",
  "argocd",
  // Databases
  "sql",
  "postgresql",
  "postgres",
  "mysql",
  "mariadb",
  "mongodb",
  "redis",
  "dynamodb",
  "cassandra",
  "elasticsearch",
  "neo4j",
  "sqlite",
  "oracle",
  "mssql",
  // Data/ML
  "machine learning",
  "deep learning",
  "neural network",
  "tensorflow",
  "pytorch",
  "keras",
  "scikit-learn",
  "pandas",
  "numpy",
  "jupyter",
  "spark",
  "hadoop",
  "airflow",
  "dbt",
  "snowflake",
  "databricks",
  "mlops",
  // API/Architecture
  "api",
  "rest",
  "restful",
  "graphql",
  "grpc",
  "microservices",
  "serverless",
  "lambda",
  "event-driven",
  "message queue",
  "rabbitmq",
  "kafka",
  "sqs",
  // Testing
  "unit testing",
  "integration testing",
  "e2e",
  "jest",
  "mocha",
  "cypress",
  "playwright",
  "selenium",
  "pytest",
  // Methodologies
  "agile",
  "scrum",
  "kanban",
  "tdd",
  "bdd",
  "devops",
  "sre",
  "gitops",
];

const HEALTHCARE_KEYWORDS = [
  "hipaa",
  "hl7",
  "fhir",
  "epic",
  "cerner",
  "emr",
  "ehr",
  "clinical",
  "patient care",
  "healthcare",
  "medical",
  "pharmacy",
  "telemedicine",
  "icd-10",
  "cms",
  "medicare",
  "medicaid",
  "hitech",
  "meaningful use",
  "clinical trials",
  "fda",
  "phi",
  "healthcare analytics",
];

const FINANCE_KEYWORDS = [
  "sox",
  "sarbanes-oxley",
  "kyc",
  "aml",
  "anti-money laundering",
  "basel",
  "sec",
  "finra",
  "pci",
  "pci-dss",
  "financial services",
  "banking",
  "trading",
  "risk management",
  "portfolio",
  "investment",
  "fintech",
  "blockchain",
  "cryptocurrency",
  "quantitative",
  "algorithmic trading",
  "hedge fund",
  "private equity",
  "wealth management",
];

const SOFT_SKILLS = [
  "leadership",
  "communication",
  "collaboration",
  "teamwork",
  "problem-solving",
  "analytical",
  "strategic",
  "mentoring",
  "coaching",
  "stakeholder management",
  "project management",
  "cross-functional",
  "presentation",
  "negotiation",
  "conflict resolution",
  "time management",
  "prioritization",
  "decision making",
];

const ALL_KEYWORDS = [
  ...TECH_KEYWORDS,
  ...HEALTHCARE_KEYWORDS,
  ...FINANCE_KEYWORDS,
  ...SOFT_SKILLS,
];

/**
 * Extract technical keywords and skills from text
 * Uses comprehensive keyword lists across multiple domains
 */
export function extractKeywords(text: string): {
  keywords: string[];
  count: number;
} {
  const lowerText = text.toLowerCase();

  // Find matching keywords from our comprehensive lists
  const foundKeywords = ALL_KEYWORDS.filter((term) =>
    lowerText.includes(term.toLowerCase())
  );

  // Remove duplicates (e.g., "node" and "nodejs" both match)
  const uniqueKeywords = [...new Set(foundKeywords)];

  return {
    keywords: uniqueKeywords,
    count: uniqueKeywords.length,
  };
}

/**
 * Extract keywords dynamically from text (for job descriptions)
 * This extracts potential skill terms that aren't in our predefined lists
 */
export function extractDynamicKeywords(text: string): {
  keywords: string[];
  technicalTerms: string[];
  tools: string[];
} {
  // Extract potential technical terms using patterns
  const technicalPatterns = [
    // Capitalized words that might be tools/technologies (e.g., "Docker", "Kubernetes")
    /\b[A-Z][a-z]+(?:\.[A-Z][a-z]+)?\b/g,
    // Terms with version numbers (e.g., "Python 3.x", "React 18")
    /\b[A-Za-z]+\s*\d+(?:\.\d+)*\b/g,
    // Acronyms (e.g., "AWS", "GCP", "CI/CD")
    /\b[A-Z]{2,5}\b/g,
  ];

  const extractedTerms = new Set<string>();
  technicalPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => {
        const term = m.trim().toLowerCase();
        // Filter out common words that aren't tech terms
        if (
          term.length >= 2 &&
          !["the", "and", "for", "with", "from", "this", "that", "will", "are"].includes(term)
        ) {
          extractedTerms.add(m.trim());
        }
      });
    }
  });

  // Separate into categories
  const keywords: string[] = [];
  const technicalTerms: string[] = [];
  const tools: string[] = [];

  extractedTerms.forEach((term) => {
    const lower = term.toLowerCase();
    if (ALL_KEYWORDS.includes(lower)) {
      keywords.push(lower);
    } else if (/^[A-Z]{2,5}$/.test(term)) {
      // Acronyms are likely tools/platforms
      tools.push(term);
    } else {
      technicalTerms.push(term);
    }
  });

  return {
    keywords: [...new Set(keywords)],
    technicalTerms: [...new Set(technicalTerms)],
    tools: [...new Set(tools)],
  };
}

/**
 * Get domain-specific keywords based on detected industry
 */
export function getDomainKeywords(text: string): {
  domain: string | null;
  keywords: string[];
} {
  const lowerText = text.toLowerCase();

  // Detect domain based on keyword frequency
  const healthcareScore = HEALTHCARE_KEYWORDS.filter((k) =>
    lowerText.includes(k)
  ).length;
  const financeScore = FINANCE_KEYWORDS.filter((k) =>
    lowerText.includes(k)
  ).length;

  if (healthcareScore >= 2) {
    return { domain: "healthcare", keywords: HEALTHCARE_KEYWORDS };
  }
  if (financeScore >= 2) {
    return { domain: "finance", keywords: FINANCE_KEYWORDS };
  }

  return { domain: null, keywords: TECH_KEYWORDS };
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
