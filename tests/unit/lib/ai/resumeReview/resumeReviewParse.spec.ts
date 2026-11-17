import { parseResumeReview } from "@/lib/ai/resumeReview/parse";

describe("parseResumeReview", () => {
  it("parses a valid SCORES line and strips it from the body", () => {
    const raw =
      "SCORES: overall=80 impact=70 clarity=90 ats=60\n\n## Summary\nGood resume.";
    const result = parseResumeReview(raw);

    expect(result.scores).toEqual({
      overall: 80,
      impact: 70,
      clarity: 90,
      atsCompatibility: 60,
    });
    expect(result.body).toBe("## Summary\nGood resume.");
  });

  it("clamps out-of-range values into 0-100", () => {
    const raw = "SCORES: overall=1000 impact=0 clarity=50 ats=999\n\nBody.";
    const result = parseResumeReview(raw);

    expect(result.scores).toEqual({
      overall: 100,
      impact: 0,
      clarity: 50,
      atsCompatibility: 100,
    });
  });

  it("returns no scores when the SCORES line is missing, and strips a leading partial line", () => {
    const raw = "SCORES: overall=5\n\nJust some body text.";
    const result = parseResumeReview(raw);

    expect(result.scores).toBeUndefined();
    expect(result.body).toBe("Just some body text.");
  });

  it("strips <think> blocks before parsing", () => {
    const raw =
      "<think>reasoning about the resume</think>SCORES: overall=80 impact=70 clarity=90 ats=60\n\n## Summary\nGood resume.";
    const result = parseResumeReview(raw);

    expect(result.scores).toEqual({
      overall: 80,
      impact: 70,
      clarity: 90,
      atsCompatibility: 60,
    });
    expect(result.body).toBe("## Summary\nGood resume.");
  });

  it("trims leading whitespace from the body", () => {
    const raw = "SCORES: overall=80 impact=70 clarity=90 ats=60\n\n\n   ## Summary";
    const result = parseResumeReview(raw);

    expect(result.body).toBe("## Summary");
  });
});
