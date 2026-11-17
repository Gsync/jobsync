import { describe, it, expect } from "vitest";
import { AUTOMATION_JOB_MATCH_SYSTEM_PROMPT } from "@/lib/ai/prompts/automation-match";

describe("AUTOMATION_JOB_MATCH_SYSTEM_PROMPT", () => {
  it("contains the exact SCORES line spec", () => {
    expect(AUTOMATION_JOB_MATCH_SYSTEM_PROMPT).toContain(
      "SCORES: match=<0-100> recommendation=<strong|good|partial|weak>",
    );
  });

  it("requires a ## Summary heading", () => {
    expect(AUTOMATION_JOB_MATCH_SYSTEM_PROMPT).toContain("## Summary");
  });

  it("does not contain the full-analysis section headings", () => {
    const fullSections = [
      "## Requirements",
      "## Skills",
      "## Experience",
      "## Keywords",
      "## Deal Breakers",
      "## Tailoring Tips",
    ];
    for (const section of fullSections) {
      expect(AUTOMATION_JOB_MATCH_SYSTEM_PROMPT).not.toContain(section);
    }
  });
});
