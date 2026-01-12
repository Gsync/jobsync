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
          ![
            "the",
            "and",
            "for",
            "with",
            "from",
            "this",
            "that",
            "will",
            "are",
          ].includes(term)
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

// ============================================================================
// SEMANTIC EXTRACTION FUNCTIONS (Phase 1 Improvements + Phase 4 Optimization)
// Uses LLM for dynamic, context-aware extraction instead of hard-coded lists
// Phase 4: Provider-aware prompts for Ollama vs Cloud optimization
// ============================================================================

import { generateObject } from "ai";
import { getModel, ProviderType } from "./providers";
import {
  SemanticKeywordSchema,
  ActionVerbAnalysisSchema,
  SemanticSkillMatchSchema,
  type SemanticKeywordExtraction,
  type ActionVerbAnalysis,
  type SemanticSkillMatch,
} from "./schemas";
import {
  getKeywordPrompt,
  getVerbPrompt,
  getSkillMatchPrompt,
  getSimilarityPrompt,
} from "./prompts/semantic-prompts";
import {
  OllamaSemanticKeywordSchema,
  OllamaActionVerbSchema,
  OllamaSkillMatchSchema,
  OllamaSemanticSimilaritySchema,
} from "./prompts/ollama-schemas";

/**
 * Check if provider is Ollama (local models that need simplified prompts)
 */
function isOllamaProvider(provider: ProviderType): boolean {
  return provider === "ollama";
}

/**
 * Extract keywords using LLM for dynamic, semantic understanding
 * Replaces hard-coded keyword lists with intelligent extraction
 *
 * Benefits:
 * - Automatically adapts to new technologies
 * - Understands context (e.g., "python" in programming vs biology)
 * - Recognizes synonyms and variations (k8s = kubernetes)
 * - No maintenance required for keyword lists
 *
 * @param text - Resume or job description text
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for extraction
 * @param contextHint - Optional hint about domain (e.g., "software engineering", "healthcare")
 */
export async function extractSemanticKeywords(
  text: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2",
  contextHint?: string
): Promise<SemanticKeywordExtraction> {
  const model = getModel(provider, modelName);
  // Phase 4: Provider-aware schema and prompt selection
  const schema = isOllamaProvider(provider)
    ? OllamaSemanticKeywordSchema
    : SemanticKeywordSchema;
  const prompt = getKeywordPrompt(provider, text, contextHint);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.1,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      return {
        technical_skills: object.technical_skills,
        tools_platforms: (object as { tools: string[] }).tools || [],
        methodologies: [],
        domain_knowledge: [],
        soft_skills: [],
        total_count: object.total_count,
      };
    }

    return object as SemanticKeywordExtraction;
  } catch (error) {
    console.error("Semantic keyword extraction failed:", error);
    // Fallback to legacy extraction if LLM fails
    const fallbackKeywords = extractKeywords(text);
    return {
      technical_skills: fallbackKeywords.keywords.slice(0, 20),
      tools_platforms: [],
      methodologies: [],
      domain_knowledge: [],
      soft_skills: [],
      total_count: fallbackKeywords.count,
    };
  }
}

/**
 * Analyze action verbs using LLM for semantic strength assessment
 * Replaces hard-coded verb lists with intelligent analysis
 *
 * Benefits:
 * - Understands verb strength in context
 * - Identifies passive constructions
 * - Provides specific improvement suggestions
 * - Recognizes weak phrases like "responsible for"
 *
 * @param text - Resume text to analyze
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for analysis
 */
export async function analyzeActionVerbs(
  text: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<ActionVerbAnalysis> {
  const model = getModel(provider, modelName);
  // Phase 4: Provider-aware schema and prompt selection
  const schema = isOllamaProvider(provider)
    ? OllamaActionVerbSchema
    : ActionVerbAnalysisSchema;
  const prompt = getVerbPrompt(provider, text);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      const ollamaResult = object as {
        strong_verbs: string[];
        weak_verbs: string[];
        verb_strength_score: number;
      };
      return {
        strong_verbs: ollamaResult.strong_verbs.map((verb) => ({
          verb,
          context: "Found in resume",
          impact_level: "medium" as const,
        })),
        weak_verbs: ollamaResult.weak_verbs.map((verb) => ({
          verb,
          context: "Found in resume",
          suggestion: "",
        })),
        verb_strength_score: ollamaResult.verb_strength_score,
      };
    }

    return object as ActionVerbAnalysis;
  } catch (error) {
    console.error("Action verb analysis failed:", error);
    // Fallback to legacy counting if LLM fails
    const fallbackVerbs = countActionVerbs(text);
    return {
      strong_verbs: fallbackVerbs.verbs.map((verb) => ({
        verb,
        context: "Found in resume",
        impact_level: "medium" as const,
      })),
      weak_verbs: [],
      verb_strength_score: Math.min(fallbackVerbs.count, 10),
    };
  }
}

/**
 * Perform semantic skill matching between resume and job
 * Uses LLM to understand skill relationships and transferability
 *
 * Benefits:
 * - Recognizes related skills (PostgreSQL vs MySQL)
 * - Assesses skill transferability
 * - Provides learnability estimates
 * - Gives strategic application advice
 *
 * @param resumeText - Candidate's resume text
 * @param jobText - Job description text
 * @param provider - AI provider (ollama/openai)
 * @param modelName - Model to use for matching
 */
export async function performSemanticSkillMatch(
  resumeText: string,
  jobText: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<SemanticSkillMatch> {
  const model = getModel(provider, modelName);
  // Phase 4: Provider-aware schema and prompt selection
  const schema = isOllamaProvider(provider)
    ? OllamaSkillMatchSchema
    : SemanticSkillMatchSchema;
  const prompt = getSkillMatchPrompt(provider, resumeText, jobText);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      const ollamaResult = object as {
        matched_skills: Array<{ skill: string; evidence: string }>;
        missing_skills: string[];
        match_percentage: number;
      };
      return {
        exact_matches: ollamaResult.matched_skills
          .filter((m) => m.skill.trim())
          .map((m) => ({
            skill: m.skill,
            resume_evidence: m.evidence,
            job_requirement: "Required by job",
          })),
        related_matches: [],
        missing_skills: ollamaResult.missing_skills
          .filter((s) => s.trim())
          .map((skill) => ({
            skill,
            importance: "important" as const,
            learnability: "moderate" as const,
          })),
        overall_match_percentage: ollamaResult.match_percentage,
      };
    }

    // Post-process cloud result to remove empty strings and duplicates
    const cloudResult = object as SemanticSkillMatch;
    const cleanedResult = {
      exact_matches: cloudResult.exact_matches.filter(
        (match) =>
          match.skill.trim() &&
          match.resume_evidence.trim() &&
          match.job_requirement.trim()
      ),
      related_matches: cloudResult.related_matches.filter(
        (match) =>
          match.job_skill.trim() &&
          match.resume_skill.trim() &&
          match.explanation.trim()
      ),
      missing_skills: cloudResult.missing_skills.filter((skill) =>
        skill.skill.trim()
      ),
      overall_match_percentage: cloudResult.overall_match_percentage,
    };

    // Remove duplicate skills from missing_skills if they're in exact_matches
    const exactSkills = new Set(
      cleanedResult.exact_matches.map((m) => m.skill.toLowerCase())
    );
    cleanedResult.missing_skills = cleanedResult.missing_skills.filter(
      (m) => !exactSkills.has(m.skill.toLowerCase())
    );

    return cleanedResult;
  } catch (error) {
    console.error("Semantic skill matching failed:", error);
    // Fallback to legacy keyword overlap if LLM fails
    const fallbackOverlap = calculateKeywordOverlap(resumeText, jobText);
    return {
      exact_matches: fallbackOverlap.matchedKeywords.map((skill) => ({
        skill,
        resume_evidence: "Found in resume",
        job_requirement: "Required by job",
      })),
      related_matches: [],
      missing_skills: fallbackOverlap.missingKeywords.map((skill) => ({
        skill,
        importance: "important" as const,
        learnability: "moderate" as const,
      })),
      overall_match_percentage: fallbackOverlap.overlapPercentage,
    };
  }
}

/**
 * Get keyword count from semantic extraction (for backward compatibility)
 */
export function getKeywordCountFromSemantic(
  extraction: SemanticKeywordExtraction
): number {
  return extraction.total_count;
}

/**
 * Get verb count from semantic analysis (for backward compatibility)
 */
export function getVerbCountFromSemantic(analysis: ActionVerbAnalysis): number {
  return analysis.strong_verbs.length;
}

// ============================================================================
// PHASE 3: SEMANTIC SIMILARITY WITH EXPLANATIONS
// Complete semantic understanding of resume-job fit, replacing keyword overlap
// ============================================================================

import { SemanticSimilaritySchema, type SemanticSimilarityResult } from "./schemas";

/**
 * Calculate semantic similarity between resume and job description
 * This is the core Phase 3 function that replaces keyword overlap entirely
 *
 * Uses LLM to:
 * 1. Calculate overall semantic similarity (0-100)
 * 2. Generate human-readable explanation of fit
 * 3. Identify key matching areas and gaps
 * 4. Provide strategic application advice
 *
 * @param resumeText - Candidate's resume text
 * @param jobDescription - Job description text
 * @param provider - AI provider (ollama/openai/deepseek)
 * @param modelName - Model to use
 * @returns SemanticSimilarityResult with score, explanations, and recommendations
 */
export async function calculateSemanticSimilarity(
  resumeText: string,
  jobDescription: string,
  provider: ProviderType = "ollama",
  modelName: string = "llama3.2"
): Promise<SemanticSimilarityResult> {
  const model = getModel(provider, modelName);
  // Phase 4: Provider-aware schema and prompt selection
  const schema = isOllamaProvider(provider)
    ? OllamaSemanticSimilaritySchema
    : SemanticSimilaritySchema;
  const prompt = getSimilarityPrompt(provider, resumeText, jobDescription);

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.2,
    });

    // Normalize Ollama result to full schema format
    if (isOllamaProvider(provider)) {
      const ollamaResult = object as {
        similarity_score: number;
        match_explanation: string;
        key_gaps: string[];
      };
      return {
        similarity_score: ollamaResult.similarity_score,
        match_explanation: ollamaResult.match_explanation,
        key_matches: [],
        key_gaps: ollamaResult.key_gaps.map((gap) => ({
          skill: gap,
          note: "Missing from resume",
        })),
        transferable_skills: [],
        application_recommendation:
          ollamaResult.similarity_score >= 60
            ? "Consider applying - good fit"
            : "Consider upskilling before applying",
      };
    }

    return object as SemanticSimilarityResult;
  } catch (error) {
    console.error("Semantic similarity calculation failed:", error);
    // Fallback to legacy keyword overlap if LLM fails
    const fallbackOverlap = calculateKeywordOverlap(resumeText, jobDescription);
    return {
      similarity_score: fallbackOverlap.overlapPercentage,
      match_explanation: `Based on keyword analysis: ${fallbackOverlap.matchedKeywords.length} of ${fallbackOverlap.totalJobKeywords} keywords matched (${fallbackOverlap.overlapPercentage}% overlap).`,
      key_matches: fallbackOverlap.matchedKeywords.slice(0, 5).map((k) => `Has ${k}`),
      key_gaps: fallbackOverlap.missingKeywords.slice(0, 5).map((k) => ({ skill: k, note: "Not found in resume" })),
      transferable_skills: [],
      application_recommendation:
        fallbackOverlap.overlapPercentage >= 60
          ? "Consider applying - decent keyword match"
          : "Consider upskilling before applying - low keyword match",
    };
  }
}

/**
 * Generate a comprehensive match explanation combining semantic skill matching
 * and overall similarity assessment
 *
 * This function synthesizes data from performSemanticSkillMatch and calculateSemanticSimilarity
 * to create detailed, actionable explanations for the user
 *
 * @param skillMatch - Result from performSemanticSkillMatch
 * @param similarity - Result from calculateSemanticSimilarity
 * @returns Structured explanation with fit summary and detailed insights
 */
export function generateMatchExplanation(
  skillMatch: SemanticSkillMatch,
  similarity: SemanticSimilarityResult
): {
  summary: string;
  fit_assessment: string;
  strengths_explanation: string[];
  gaps_explanation: string[];
  transferable_explanation: string[];
  action_items: string[];
} {
  // Generate strengths explanation from exact and related matches
  const strengthsExplanation: string[] = [];

  skillMatch.exact_matches.slice(0, 3).forEach(match => {
    strengthsExplanation.push(
      `✅ **${match.skill}**: Directly matches requirement - "${match.resume_evidence.substring(0, 60)}..."`
    );
  });

  skillMatch.related_matches.slice(0, 2).forEach(match => {
    strengthsExplanation.push(
      `⚡ **${match.resume_skill}** transfers to **${match.job_skill}** (${match.similarity}% similar): ${match.explanation}`
    );
  });

  // Generate gaps explanation with learnability context
  const gapsExplanation: string[] = [];

  skillMatch.missing_skills.slice(0, 4).forEach(skill => {
    const urgencyIcon = skill.importance === "critical" ? "🔴" : skill.importance === "important" ? "🟡" : "🟢";
    const learnTime = skill.learnability === "quick" ? "<1 month" : skill.learnability === "moderate" ? "1-3 months" : "3+ months";
    gapsExplanation.push(
      `${urgencyIcon} **${skill.skill}** (${skill.importance}): Learning time ~${learnTime}`
    );
  });

  // Generate transferable skills explanation
  const transferableExplanation: string[] = similarity.transferable_skills.map(skill =>
    `💡 ${skill.resume_skill} → ${skill.job_skill}: ${skill.how_it_transfers}`
  );

  // Generate prioritized action items
  const actionItems: string[] = [];

  // Critical missing skills first
  const criticalMissing = skillMatch.missing_skills.filter(s => s.importance === "critical");
  if (criticalMissing.length > 0) {
    actionItems.push(`🔴 Address critical gaps first: ${criticalMissing.map(s => s.skill).join(", ")}`);
  }

  // Quick wins
  const quickLearns = skillMatch.missing_skills.filter(s => s.learnability === "quick" && s.importance !== "nice-to-have");
  if (quickLearns.length > 0) {
    actionItems.push(`⚡ Quick wins (learn in <1 month): ${quickLearns.map(s => s.skill).join(", ")}`);
  }

  // Highlight existing transferable skills in application
  if (skillMatch.related_matches.length > 0) {
    actionItems.push(`📝 Highlight transferable skills in cover letter: ${skillMatch.related_matches.slice(0, 3).map(m => m.resume_skill).join(", ")}`);
  }

  // Fit assessment based on scores
  let fitAssessment: string;
  const score = similarity.similarity_score;
  if (score >= 75) {
    fitAssessment = "Excellent fit - You're a strong candidate for this role.";
  } else if (score >= 60) {
    fitAssessment = "Good fit - You match most requirements with minor gaps.";
  } else if (score >= 45) {
    fitAssessment = "Moderate fit - Some gaps exist but may be worth applying with a tailored resume.";
  } else if (score >= 30) {
    fitAssessment = "Weak fit - Significant gaps; consider upskilling before applying.";
  } else {
    fitAssessment = "Poor fit - This role may not align with your current skills and experience.";
  }

  return {
    summary: similarity.match_explanation,
    fit_assessment: fitAssessment,
    strengths_explanation: strengthsExplanation,
    gaps_explanation: gapsExplanation,
    transferable_explanation: transferableExplanation,
    action_items: actionItems.length > 0 ? actionItems : ["No critical actions needed - proceed with application"],
  };
}

// ============================================================================
// LEGACY FUNCTION DEPRECATION NOTICES
// ============================================================================

/**
 * @deprecated Use `extractSemanticKeywords()` instead for context-aware extraction.
 * This function uses hard-coded keyword lists which may miss relevant skills
 * or produce false positives.
 *
 * Scheduled for removal in v2.0
 */
export const extractKeywordsLegacy = extractKeywords;

/**
 * @deprecated Use `analyzeActionVerbs()` instead for semantic verb analysis.
 * This function only counts predefined verbs and doesn't assess context.
 *
 * Scheduled for removal in v2.0
 */
export const countActionVerbsLegacy = countActionVerbs;

/**
 * @deprecated Use `calculateSemanticSimilarity()` instead for semantic matching.
 * This function only performs simple string matching without understanding context.
 *
 * Scheduled for removal in v2.0
 */
export const calculateKeywordOverlapLegacy = calculateKeywordOverlap;
