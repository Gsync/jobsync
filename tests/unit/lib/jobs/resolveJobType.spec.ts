import { resolveJobType } from "@/lib/jobs/resolve";

describe("resolveJobType", () => {
  it("resolves a valid key", () => {
    expect(resolveJobType("FT")).toBe("FT");
  });

  it("resolves a valid label", () => {
    expect(resolveJobType("Contract")).toBe("C");
  });

  it("resolves case-insensitively", () => {
    expect(resolveJobType("part-time")).toBe("PT");
  });

  it("resolves a separator variant of a label", () => {
    expect(resolveJobType("Full time")).toBe("FT");
    expect(resolveJobType("parttime")).toBe("PT");
  });

  it("defaults to the first entry for empty input", () => {
    expect(resolveJobType(undefined)).toBe("FT");
    expect(resolveJobType("")).toBe("FT");
  });

  it("throws a helpful message for an invalid value", () => {
    expect(() => resolveJobType("Internship")).toThrow(
      /Invalid jobType "Internship"\. Valid values: Full-time, Part-time, Contract/,
    );
  });
});
