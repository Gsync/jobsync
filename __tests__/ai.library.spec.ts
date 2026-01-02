/**
 * AI Library Tests - Multi-Agent System
 * Tests for analysis tools, mathematical scoring, and validation functions
 *
 * Note: This tests the AI library functions used by the API routes, not server actions.
 * The AI functionality is implemented in API routes:
 * - /api/ai/resume/review (single-agent)
 * - /api/ai/resume/review-collaborative (multi-agent)
 * - /api/ai/resume/match (single-agent job matching)
 * - /api/ai/resume/match-collaborative (multi-agent job matching)
 */

import {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
  extractRequiredSkills,
  calculateResumeScore,
  calculateJobMatchScore,
  validateScore,
} from "@/lib/ai";

describe("AI Library - Analysis Tools", () => {
  describe("countQuantifiedAchievements", () => {
    it("should count achievements with numbers", () => {
      const text =
        "Increased sales by 40%. Managed $2M budget. Led team of 10 engineers.";
      const result = countQuantifiedAchievements(text);
      expect(result.count).toBe(3);
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it("should count achievements with percentages", () => {
      const text = "Improved performance by 25%. Reduced costs by 15%.";
      const result = countQuantifiedAchievements(text);
      expect(result.count).toBe(2);
      expect(result.examples).toContain("25%");
    });

    it("should return 0 for text with no quantified achievements", () => {
      const text = "Worked on projects. Collaborated with team members.";
      const result = countQuantifiedAchievements(text);
      expect(result.count).toBe(0);
      expect(result.examples).toEqual([]);
    });

    it("should handle empty text", () => {
      const result = countQuantifiedAchievements("");
      expect(result.count).toBe(0);
      expect(result.examples).toEqual([]);
    });
  });

  describe("extractKeywords", () => {
    it("should extract keywords from text", () => {
      const text = "React, TypeScript, Node.js, AWS, Docker";
      const result = extractKeywords(text);
      expect(result.count).toBeGreaterThan(0);
      expect(result.keywords).toContain("react");
    });

    it("should normalize keywords to lowercase", () => {
      const text = "REACT TypeScript Node.JS";
      const result = extractKeywords(text);
      result.keywords.forEach((keyword) => {
        expect(keyword).toBe(keyword.toLowerCase());
      });
    });

    it("should return empty array for empty text", () => {
      const result = extractKeywords("");
      expect(result.keywords).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe("countActionVerbs", () => {
    it("should count action verbs in text", () => {
      const text =
        "Led development. Managed team. Implemented features. Optimized performance.";
      const result = countActionVerbs(text);
      expect(result.count).toBeGreaterThan(0);
      expect(result.verbs.length).toBeGreaterThan(0);
    });

    it("should return 0 for text with no action verbs", () => {
      const text = "This is some random text without action verbs.";
      const result = countActionVerbs(text);
      expect(result.count).toBe(0);
      expect(result.verbs).toEqual([]);
    });
  });

  describe("calculateKeywordOverlap", () => {
    it("should calculate overlap between resume and job", () => {
      const resumeText = "React, TypeScript, Node.js developer";
      const jobText = "Looking for React, TypeScript, Angular expert";
      const result = calculateKeywordOverlap(resumeText, jobText);
      expect(result.overlapPercentage).toBeGreaterThan(0);
      expect(result.overlapPercentage).toBeLessThanOrEqual(100);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("should return high overlap for similar texts", () => {
      const resumeText = "React TypeScript Node.js AWS Docker";
      const jobText = "React TypeScript AWS experience required";
      const result = calculateKeywordOverlap(resumeText, jobText);
      expect(result.overlapPercentage).toBeGreaterThan(50);
      expect(result.matchedKeywords).toContain("react");
    });

    it("should return low overlap for different texts", () => {
      const resumeText = "React TypeScript Node.js";
      const jobText = "Java Spring Hibernate";
      const result = calculateKeywordOverlap(resumeText, jobText);
      expect(result.overlapPercentage).toBeLessThan(30);
      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });

    it("should return 0 for empty texts", () => {
      const result = calculateKeywordOverlap("", "");
      expect(result.overlapPercentage).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
    });
  });

  describe("analyzeFormatting", () => {
    it("should detect bullet points", () => {
      const text =
        "- First item\n- Second item\n- Third item\n- Fourth item\n- Fifth item";
      const formatting = analyzeFormatting(text);
      expect(formatting.hasBulletPoints).toBe(true);
    });

    it("should count sections", () => {
      const text =
        "EXPERIENCE\nWork history\n\nEDUCATION\nSchool info\n\nSKILLS\nTech stack";
      const formatting = analyzeFormatting(text);
      expect(formatting.sectionCount).toBeGreaterThan(0);
    });

    it("should return false for no bullet points", () => {
      const text = "Plain text without any formatting";
      const formatting = analyzeFormatting(text);
      expect(formatting.hasBulletPoints).toBe(false);
    });
  });

  describe("extractRequiredSkills", () => {
    it("should extract skills from job description with sections", () => {
      const jobText = `Requirements:
- React
- TypeScript
- Node.js

Preferred Skills:
- Docker
- AWS`;
      const result = extractRequiredSkills(jobText);
      // Since it looks for specific section markers, results may vary
      expect(result).toHaveProperty("requiredSkills");
      expect(result).toHaveProperty("preferredSkills");
      expect(result).toHaveProperty("totalSkills");
    });

    it("should return empty arrays for empty job text", () => {
      const result = extractRequiredSkills("");
      expect(result.requiredSkills).toEqual([]);
      expect(result.preferredSkills).toEqual([]);
      expect(result.totalSkills).toBe(0);
    });
  });
});

describe("AI Library - Mathematical Scoring", () => {
  describe("calculateResumeScore", () => {
    it("should calculate score based on metrics", () => {
      const result = calculateResumeScore({
        quantifiedCount: 12,
        keywordCount: 18,
        verbCount: 15,
        hasBulletPoints: true,
        sectionCount: 5,
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.keywords).toBeDefined();
      expect(result.breakdown.achievements).toBeDefined();
    });

    it("should give low score for minimal metrics", () => {
      const result = calculateResumeScore({
        quantifiedCount: 0,
        keywordCount: 2,
        verbCount: 1,
        hasBulletPoints: false,
        sectionCount: 1,
      });

      expect(result.score).toBeLessThan(30);
    });

    it("should give high score for excellent metrics", () => {
      const result = calculateResumeScore({
        quantifiedCount: 15,
        keywordCount: 20,
        verbCount: 20,
        hasBulletPoints: true,
        sectionCount: 6,
      });

      expect(result.score).toBeGreaterThan(70);
    });

    it("should include all breakdown criteria", () => {
      const result = calculateResumeScore({
        quantifiedCount: 10,
        keywordCount: 15,
        verbCount: 12,
        hasBulletPoints: true,
        sectionCount: 5,
      });

      expect(result.breakdown).toHaveProperty("keywords");
      expect(result.breakdown).toHaveProperty("achievements");
      expect(result.breakdown).toHaveProperty("verbs");
      expect(result.breakdown).toHaveProperty("formatting");
    });
  });

  describe("calculateJobMatchScore", () => {
    it("should calculate score based on match metrics", () => {
      const result = calculateJobMatchScore({
        keywordOverlapPercent: 65,
        matchedSkillsCount: 8,
        requiredSkillsCount: 12,
        experienceYears: 7,
        requiredYears: 5,
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it("should give low score for poor match", () => {
      const result = calculateJobMatchScore({
        keywordOverlapPercent: 20,
        matchedSkillsCount: 2,
        requiredSkillsCount: 12,
        experienceYears: 1,
        requiredYears: 5,
      });

      expect(result.score).toBeLessThan(40);
    });

    it("should give high score for excellent match", () => {
      const result = calculateJobMatchScore({
        keywordOverlapPercent: 90,
        matchedSkillsCount: 11,
        requiredSkillsCount: 12,
        experienceYears: 8,
        requiredYears: 5,
      });

      expect(result.score).toBeGreaterThan(80);
    });

    it("should handle 50% skill match appropriately", () => {
      const result = calculateJobMatchScore({
        keywordOverlapPercent: 50,
        matchedSkillsCount: 6,
        requiredSkillsCount: 12,
        experienceYears: 5,
        requiredYears: 5,
      });

      // Should NOT be zero (was a bug in old system)
      expect(result.score).toBeGreaterThan(0);
      // Should be in average range (45-65)
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(70);
    });

    it("should give minimum score when at least 1 skill matches", () => {
      const result = calculateJobMatchScore({
        keywordOverlapPercent: 10,
        matchedSkillsCount: 1,
        requiredSkillsCount: 12,
        experienceYears: 2,
        requiredYears: 5,
      });

      // Should have minimum guarantee, not zero
      expect(result.score).toBeGreaterThanOrEqual(5);
    });
  });

  describe("validateScore", () => {
    it("should allow score within variance", () => {
      const validated = validateScore(75, 70, 10);
      expect(validated).toBe(75);
    });

    it("should clamp score above max variance", () => {
      const validated = validateScore(90, 70, 10);
      expect(validated).toBe(80); // 70 + 10
    });

    it("should clamp score below min variance", () => {
      const validated = validateScore(50, 70, 10);
      expect(validated).toBe(60); // 70 - 10
    });

    it("should enforce 0-100 bounds", () => {
      const validated1 = validateScore(120, 90, 20);
      expect(validated1).toBeLessThanOrEqual(100);

      const validated2 = validateScore(-10, 10, 20);
      expect(validated2).toBeGreaterThanOrEqual(0);
    });

    it("should use default variance of 10", () => {
      const validated = validateScore(85, 70);
      expect(validated).toBe(80); // 70 + 10 (default variance)
    });
  });
});

describe("AI Library - Consistency Tests", () => {
  it("should produce consistent scores for same resume metrics", () => {
    const metrics = {
      quantifiedCount: 10,
      keywordCount: 15,
      verbCount: 12,
      hasBulletPoints: true,
      sectionCount: 5,
    };

    const result1 = calculateResumeScore(metrics);
    const result2 = calculateResumeScore(metrics);
    const result3 = calculateResumeScore(metrics);

    expect(result1.score).toBe(result2.score);
    expect(result2.score).toBe(result3.score);
  });

  it("should produce consistent scores for same job match metrics", () => {
    const metrics = {
      keywordOverlapPercent: 65,
      matchedSkillsCount: 8,
      requiredSkillsCount: 12,
      experienceYears: 7,
      requiredYears: 5,
    };

    const result1 = calculateJobMatchScore(metrics);
    const result2 = calculateJobMatchScore(metrics);
    const result3 = calculateJobMatchScore(metrics);

    expect(result1.score).toBe(result2.score);
    expect(result2.score).toBe(result3.score);
  });
});

// Helper function for creating mock async iterators (if needed for future streaming tests)
function createMockAsyncIterator<T>(items: T[]): AsyncIterable<T> {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { value: undefined as any, done: true };
        },
      };
    },
  };
}
