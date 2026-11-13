import { describe, it, expect } from "vitest";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";

describe("parseJobMatch", () => {
  it("parses a well-formed scores line and strips it from the body", () => {
    const { scores, body } = parseJobMatch(
      "SCORES: match=82 recommendation=good\n\n## Summary\nStrong fit",
    );
    expect(scores).toEqual({ matchScore: 82, recommendation: "good match" });
    expect(body).toBe("## Summary\nStrong fit");
  });

  it("clamps an out-of-range score into 0-100", () => {
    const { scores } = parseJobMatch(
      "SCORES: match=1000 recommendation=strong\n\nBody",
    );
    expect(scores?.matchScore).toBe(100);
  });

  it("returns undefined scores when no scores line is present", () => {
    const { scores, body } = parseJobMatch("## Summary\nNo score header here");
    expect(scores).toBeUndefined();
    expect(body).toBe("## Summary\nNo score header here");
  });

  it("hides a partial leading SCORES line while it is still streaming", () => {
    const { scores, body } = parseJobMatch("SCORES: match=8");
    expect(scores).toBeUndefined();
    expect(body).toBe("");
  });

  it("maps the recommendation token case-insensitively", () => {
    const { scores } = parseJobMatch(
      "SCORES: match=70 RECOMMENDATION=STRONG\n\nBody",
    );
    expect(scores?.recommendation).toBe("strong match");
  });

  it("strips a leading <think> block before parsing", () => {
    const { scores, body } = parseJobMatch(
      "<think>weighing the fit</think>SCORES: match=50 recommendation=partial\n\nBody",
    );
    expect(scores).toEqual({ matchScore: 50, recommendation: "partial match" });
    expect(body).toBe("Body");
  });
});
