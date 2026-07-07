import { resolveWorkplaceType } from "@/lib/jobs/resolve";

describe("resolveWorkplaceType", () => {
  it("resolves a valid key", () => {
    expect(resolveWorkplaceType("REMOTE")).toBe("REMOTE");
  });

  it("resolves a valid label", () => {
    expect(resolveWorkplaceType("Hybrid")).toBe("HYBRID");
  });

  it("resolves case-insensitively", () => {
    expect(resolveWorkplaceType("onsite")).toBe("ONSITE");
  });

  it("returns null for empty input", () => {
    expect(resolveWorkplaceType(undefined)).toBeNull();
    expect(resolveWorkplaceType("")).toBeNull();
  });

  it("throws a helpful message for an invalid value", () => {
    expect(() => resolveWorkplaceType("Moon Base")).toThrow(
      /Invalid workplaceType "Moon Base"\. Valid values: Remote, Hybrid, Onsite/,
    );
  });
});
