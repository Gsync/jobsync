import { buildCopyTitle, ensureUniqueTitle } from "@/lib/resumeCopyTitle";

describe("buildCopyTitle", () => {
  it("appends (Copy) when nothing is taken", () => {
    expect(buildCopyTitle("Backend Resume", [])).toBe("Backend Resume (Copy)");
  });

  it("numbers subsequent copies", () => {
    expect(buildCopyTitle("Backend Resume", ["Backend Resume (Copy)"])).toBe(
      "Backend Resume (Copy 2)",
    );
    expect(
      buildCopyTitle("Backend Resume", [
        "Backend Resume (Copy)",
        "Backend Resume (Copy 2)",
      ]),
    ).toBe("Backend Resume (Copy 3)");
  });

  it("compares case-insensitively and ignores surrounding whitespace", () => {
    expect(buildCopyTitle("  Backend Resume  ", ["backend resume (COPY)"])).toBe(
      "Backend Resume (Copy 2)",
    );
  });

  it("strips an existing copy suffix so titles do not nest", () => {
    expect(buildCopyTitle("Backend Resume (Copy 2)", [])).toBe(
      "Backend Resume (Copy)",
    );
    expect(
      buildCopyTitle("Backend Resume (Copy)", ["Backend Resume (Copy)"]),
    ).toBe("Backend Resume (Copy 2)");
  });

  it("truncates the base so the result fits in 100 characters", () => {
    const long = "A".repeat(120);
    const result = buildCopyTitle(long, []);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith(" (Copy)")).toBe(true);
  });
});

describe("ensureUniqueTitle", () => {
  it("returns the title unchanged when free", () => {
    expect(ensureUniqueTitle("My Resume", ["Other"])).toBe("My Resume");
  });

  it("appends an incrementing counter when taken", () => {
    expect(ensureUniqueTitle("My Resume", ["my resume"])).toBe("My Resume (2)");
    expect(ensureUniqueTitle("My Resume", ["My Resume", "My Resume (2)"])).toBe(
      "My Resume (3)",
    );
  });

  it("truncates so the result fits in 100 characters", () => {
    const long = "B".repeat(120);
    const result = ensureUniqueTitle(long, [long.slice(0, 100)]);
    expect(result.length).toBeLessThanOrEqual(100);
  });
});
