import { describe, expect, it } from "vitest";
import { canExportCoverLetter } from "@/components/profile/cover-letter-export-dialog/canExportCoverLetter";

describe("canExportCoverLetter", () => {
  it("is false for empty, null and undefined content", () => {
    expect(canExportCoverLetter("")).toBe(false);
    expect(canExportCoverLetter(null)).toBe(false);
    expect(canExportCoverLetter(undefined)).toBe(false);
  });

  it("is false for whitespace-only content", () => {
    expect(canExportCoverLetter("   \n\t ")).toBe(false);
  });

  it("is false for markup carrying no text", () => {
    expect(canExportCoverLetter("<p></p>")).toBe(false);
    expect(canExportCoverLetter("<p>   </p><p><br></p>")).toBe(false);
    expect(canExportCoverLetter("<ul><li></li></ul>")).toBe(false);
  });

  it("is true for real content", () => {
    expect(canExportCoverLetter("<p>Dear hiring manager,</p>")).toBe(true);
  });

  it("is true for text inside nested markup", () => {
    expect(canExportCoverLetter("<p><strong>Hi</strong></p>")).toBe(true);
  });

  it("is true for a bare text node with no tags", () => {
    expect(canExportCoverLetter("Hi")).toBe(true);
  });
});
