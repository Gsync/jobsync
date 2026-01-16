/**
 * Job Match Response Builder
 *
 * Handles building the final JobMatchResponse from agent results and semantic data.
 */

import {
  JobMatchResponse,
  ToolDataJobMatch,
  SemanticData,
} from "@/models/ai.model";

interface AnalysisResultInput {
  keywordAnalysis: { strength: string; missingCritical: string[] };
}

interface FeedbackResultInput {
  suggestions: string[];
  synthesisNotes: string;
}

interface BaselineScore {
  score: number;
  breakdown: Record<string, number>;
}

export function buildJobMatchResponse(
  validatedScore: number,
  baselineScore: BaselineScore,
  toolData: ToolDataJobMatch,
  semanticData: SemanticData,
  analysisResult: AnalysisResultInput,
  feedbackResult: FeedbackResultInput,
  matchedSkillsCount: number,
  requiredSkillsCount: number
): JobMatchResponse {
  const detailedAnalysis = [];

  // Skills Match - use semantic skill match data if available
  if (semanticData.skillMatch) {
    const exactCount = semanticData.skillMatch.exact_matches.length;
    const relatedCount = semanticData.skillMatch.related_matches.length;
    const missingCount = semanticData.skillMatch.missing_skills.length;

    detailedAnalysis.push({
      category: `Skills Match (${baselineScore.breakdown.skillsMatch}/30 pts)`,
      value: [
        `${exactCount} exact matches, ${relatedCount} transferable skills, ${missingCount} gaps`,
        ...semanticData.skillMatch.exact_matches
          .slice(0, 3)
          .map(
            (m: { skill: string; resume_evidence: string }) =>
              `✅ ${m.skill}: "${m.resume_evidence.substring(0, 40)}..."`
          ),
        ...semanticData.skillMatch.related_matches
          .slice(0, 2)
          .map(
            (m: {
              resume_skill: string;
              job_skill: string;
              similarity: number;
            }) =>
              `⚡ ${m.resume_skill} → ${m.job_skill} (${m.similarity}% similar)`
          ),
        ...semanticData.skillMatch.missing_skills
          .filter((s: any) => s.importance === "critical")
          .slice(0, 2)
          .map(
            (s: any) => `❌ ${s.skill} (critical, ${s.learnability} to learn)`
          ),
      ],
    });
  } else {
    detailedAnalysis.push({
      category: `Skills Match (${baselineScore.breakdown.skillsMatch}/30 pts)`,
      value: [
        `Matched ${matchedSkillsCount} of ${requiredSkillsCount} required skills`,
        ...toolData.keywordOverlap.matchedKeywords
          .slice(0, 5)
          .map((k) => `✅ ${k}`),
        ...toolData.keywordOverlap.missingKeywords
          .slice(0, 3)
          .map((k) => `❌ ${k}`),
      ],
    });
  }

  // Semantic Similarity

  if (semanticData.similarity) {
    detailedAnalysis.push({
      category: `Semantic Fit (${baselineScore.breakdown.keywordOverlap}/20 pts)`,
      value: [
        `${Math.round(
          semanticData.similarity.similarity_score
        )}% semantic match`,
        semanticData.similarity.match_explanation,
        ...semanticData.similarity.key_matches.slice(0, 2),
      ],
    });
  } else {
    detailedAnalysis.push({
      category: `Keyword Overlap (${baselineScore.breakdown.keywordOverlap}/20 pts)`,
      value: [
        `${Math.round(
          toolData.keywordOverlap.overlapPercentage
        )}% keyword match`,
        analysisResult.keywordAnalysis.strength,
      ],
    });
  }

  // Transferable Skills
  if (
    semanticData.similarity &&
    semanticData.similarity.transferable_skills.length > 0
  ) {
    detailedAnalysis.push({
      category: "Transferable Skills",
      value: semanticData.similarity.transferable_skills
        .slice(0, 3)
        .map(
          (s: any) =>
            `💡 ${s.resume_skill} → ${s.job_skill}: ${s.how_it_transfers}`
        ),
    });
  }

  // Overall Assessment
  detailedAnalysis.push({
    category: "Overall Assessment",
    value: [
      semanticData.matchExplanation?.fit_assessment ||
        feedbackResult.synthesisNotes,
    ],
  });

  // Build suggestions using semantic data
  const suggestions = [];

  // Action items from semantic analysis
  if (
    semanticData.matchExplanation &&
    semanticData.matchExplanation.action_items.length > 0
  ) {
    suggestions.push({
      category: "Priority Actions",
      value: semanticData.matchExplanation.action_items.slice(0, 4),
    });
  }

  // Keywords to add
  suggestions.push({
    category: "Skills to Add",
    value: analysisResult.keywordAnalysis.missingCritical.slice(0, 4),
  });

  // Top improvements
  suggestions.push({
    category: "Top Improvements",
    value: feedbackResult.suggestions.slice(0, 4),
  });

  // Build additional comments with semantic recommendation
  const recommendation =
    semanticData.similarity?.application_recommendation ||
    (validatedScore >= 70
      ? "Apply now - strong match"
      : validatedScore >= 50
      ? "Apply after addressing key gaps"
      : "Consider upskilling before applying");

  return {
    matching_score: validatedScore,
    detailed_analysis: detailedAnalysis,
    suggestions,
    additional_comments: [
      `Score: ${validatedScore}/100 - ${
        validatedScore >= 70
          ? "Strong"
          : validatedScore >= 50
          ? "Moderate"
          : "Weak"
      } match`,
      semanticData.similarity?.match_explanation ||
        feedbackResult.synthesisNotes,
      `Recommendation: ${recommendation}`,
    ],
  };
}
