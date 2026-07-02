import {
  buildInsufficientSectionsMessage,
  hasMinResumeSections,
} from "@/lib/resumeSections";
import { APP_CONSTANTS } from "@/lib/constants";

describe("hasMinResumeSections", () => {
  it("returns false below the minimum", () => {
    expect(hasMinResumeSections(0)).toBe(false);
    expect(
      hasMinResumeSections(APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION - 1),
    ).toBe(false);
  });

  it("returns true at or above the minimum", () => {
    expect(
      hasMinResumeSections(APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION),
    ).toBe(true);
    expect(
      hasMinResumeSections(APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION + 1),
    ).toBe(true);
  });

  it("treats null/undefined as zero sections", () => {
    expect(hasMinResumeSections(null)).toBe(false);
    expect(hasMinResumeSections(undefined)).toBe(false);
  });
});

describe("buildInsufficientSectionsMessage", () => {
  it("includes the minimum count and the action", () => {
    const message = buildInsufficientSectionsMessage(
      "setting this resume as default",
    );

    expect(message).toContain(
      String(APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION),
    );
    expect(message).toContain("setting this resume as default");
  });

  it("appends the hint in parentheses when provided", () => {
    const message = buildInsufficientSectionsMessage(
      "running a review",
      "e.g. Summary and Experience",
    );

    expect(message).toContain("(e.g. Summary and Experience)");
  });

  it("omits the parentheses when no hint is provided", () => {
    const message = buildInsufficientSectionsMessage("running a review");

    expect(message).not.toContain("(");
  });
});
