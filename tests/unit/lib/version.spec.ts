import { describe, it, expect } from "vitest";
import { isNewerVersion } from "@/lib/version";

describe("isNewerVersion", () => {
  it("detects a newer patch, minor and major", () => {
    expect(isNewerVersion("1.1.18", "1.1.17")).toBe(true);
    expect(isNewerVersion("1.2.0", "1.1.17")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.1.17")).toBe(true);
  });

  it("returns false for the same or an older version", () => {
    expect(isNewerVersion("1.1.17", "1.1.17")).toBe(false);
    expect(isNewerVersion("1.1.16", "1.1.17")).toBe(false);
    expect(isNewerVersion("1.0.99", "1.1.0")).toBe(false);
  });

  it("ignores a leading v on either side", () => {
    expect(isNewerVersion("v1.2.0", "1.1.17")).toBe(true);
    expect(isNewerVersion("v1.1.17", "v1.1.17")).toBe(false);
  });

  it("compares segments numerically, not lexically", () => {
    expect(isNewerVersion("1.10.0", "1.9.0")).toBe(true);
    expect(isNewerVersion("1.9.0", "1.10.0")).toBe(false);
  });

  it("treats missing segments as zero", () => {
    expect(isNewerVersion("1.2", "1.1.17")).toBe(true);
    expect(isNewerVersion("1.1", "1.1.17")).toBe(false);
  });

  it("ignores pre-release and build suffixes", () => {
    expect(isNewerVersion("1.2.0-beta.1", "1.1.17")).toBe(true);
    expect(isNewerVersion("1.1.17-beta.1", "1.1.17")).toBe(false);
  });

  it("returns false when either side does not parse", () => {
    expect(isNewerVersion("latest", "1.1.17")).toBe(false);
    expect(isNewerVersion("1.2.0", "")).toBe(false);
    expect(isNewerVersion("", "")).toBe(false);
  });
});
