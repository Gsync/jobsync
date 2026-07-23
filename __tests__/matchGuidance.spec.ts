import { extractMatchGuidance } from "@/lib/ai/coverLetter/matchGuidance";

const body = [
  "## Summary",
  "Decent fit overall.",
  "",
  "## Keywords",
  "Found: React, TypeScript",
  "Missing: Kubernetes",
  "",
  "## Deal Breakers",
  "None.",
  "",
  "## Tailoring Tips",
  "- Lead the summary with platform work",
].join("\n");

const matchData = JSON.stringify({ matchScore: 72, body });

describe("extractMatchGuidance", () => {
  it("returns null for empty input", () => {
    expect(extractMatchGuidance(null)).toBeNull();
    expect(extractMatchGuidance(undefined)).toBeNull();
    expect(extractMatchGuidance("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(extractMatchGuidance("{not json")).toBeNull();
  });

  it("returns null when there is no body", () => {
    expect(extractMatchGuidance(JSON.stringify({ matchScore: 50 }))).toBeNull();
  });

  it("returns null when neither section is present", () => {
    const raw = JSON.stringify({ body: "## Summary\nOnly a summary." });
    expect(extractMatchGuidance(raw)).toBeNull();
  });

  it("extracts Keywords and Tailoring Tips only", () => {
    const result = extractMatchGuidance(matchData);
    expect(result).toContain("## Keywords");
    expect(result).toContain("Missing: Kubernetes");
    expect(result).toContain("## Tailoring Tips");
    expect(result).toContain("Lead the summary with platform work");
    expect(result).not.toContain("Deal Breakers");
    expect(result).not.toContain("Decent fit overall");
  });

  it("matches headings case-insensitively", () => {
    const raw = JSON.stringify({ body: "## keywords\nFound: Go" });
    expect(extractMatchGuidance(raw)).toContain("Found: Go");
  });

  it("captures a trailing section that runs to end of string", () => {
    const raw = JSON.stringify({ body: "## Tailoring Tips\n- Do the thing" });
    expect(extractMatchGuidance(raw)).toContain("- Do the thing");
  });
});
