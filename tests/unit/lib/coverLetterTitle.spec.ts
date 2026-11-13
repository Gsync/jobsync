import { buildCoverLetterTitle } from "@/lib/coverLetterTitle";

describe("buildCoverLetterTitle", () => {
  it("joins job title and company", () => {
    expect(buildCoverLetterTitle("Senior Engineer", "Acme", [])).toBe(
      "Senior Engineer - Acme",
    );
  });

  it("appends (2) when the base title is taken", () => {
    expect(
      buildCoverLetterTitle("Senior Engineer", "Acme", [
        "Senior Engineer - Acme",
      ]),
    ).toBe("Senior Engineer - Acme (2)");
  });

  it("keeps counting past (2)", () => {
    expect(
      buildCoverLetterTitle("Senior Engineer", "Acme", [
        "Senior Engineer - Acme",
        "Senior Engineer - Acme (2)",
      ]),
    ).toBe("Senior Engineer - Acme (3)");
  });

  it("compares case-insensitively and ignores surrounding space", () => {
    expect(
      buildCoverLetterTitle("Senior Engineer", "Acme", [
        "  senior engineer - acme  ",
      ]),
    ).toBe("Senior Engineer - Acme (2)");
  });

  it("trims to 100 characters", () => {
    const long = "E".repeat(120);
    const result = buildCoverLetterTitle(long, "Acme", []);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith("- Acme")).toBe(true);
  });

  it("omits the company segment when there is no company", () => {
    expect(buildCoverLetterTitle("Senior Engineer", "", [])).toBe(
      "Senior Engineer",
    );
  });
});
