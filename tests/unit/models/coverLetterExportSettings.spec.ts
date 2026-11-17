import { describe, it, expect } from "vitest";
import {
  coerceCoverLetterExportSettings,
  COVER_LETTER_NUMERIC_FIELDS,
  defaultCoverLetterExportSettings,
} from "@/models/coverLetterExport.model";

describe("defaultCoverLetterExportSettings", () => {
  it("is the letter's own literals", () => {
    expect(defaultCoverLetterExportSettings).toEqual({
      font: "helvetica",
      fontSize: 11,
      lineHeight: 1.4,
      marginVertical: 54,
      marginHorizontal: 54,
      paragraphSpacing: 10,
    });
  });

  it("lists exactly the five numeric fields the panel steps", () => {
    expect(COVER_LETTER_NUMERIC_FIELDS).toEqual([
      "fontSize",
      "lineHeight",
      "marginVertical",
      "marginHorizontal",
      "paragraphSpacing",
    ]);
  });
});

describe("coerceCoverLetterExportSettings", () => {
  it("falls back to the defaults for anything that is not an object", () => {
    for (const value of [null, undefined, 7, "helvetica", []]) {
      expect(coerceCoverLetterExportSettings(value)).toEqual(
        defaultCoverLetterExportSettings,
      );
    }
  });

  it("keeps every valid value", () => {
    const stored = {
      font: "times",
      fontSize: 12,
      lineHeight: 1.5,
      marginVertical: 72,
      marginHorizontal: 60,
      paragraphSpacing: 6,
    };
    expect(coerceCoverLetterExportSettings(stored)).toEqual(stored);
  });

  it("rejects an unknown font and falls back", () => {
    expect(coerceCoverLetterExportSettings({ font: "comic-sans" }).font).toBe(
      "helvetica",
    );
  });

  it("fills a missing key from the defaults", () => {
    const result = coerceCoverLetterExportSettings({ fontSize: 13 });
    expect(result.fontSize).toBe(13);
    expect(result.marginVertical).toBe(54);
    expect(result.paragraphSpacing).toBe(10);
  });

  it("clamps out-of-range numbers to the field's own bounds", () => {
    const result = coerceCoverLetterExportSettings({
      fontSize: 400,
      lineHeight: -5,
      marginHorizontal: 1000,
      paragraphSpacing: 99,
    });
    expect(result.fontSize).toBe(16);
    expect(result.lineHeight).toBe(1);
    expect(result.marginHorizontal).toBe(90);
    expect(result.paragraphSpacing).toBe(24);
  });

  it("replaces garbage values with the letter's defaults", () => {
    const result = coerceCoverLetterExportSettings({
      fontSize: "big",
      lineHeight: null,
      paragraphSpacing: NaN,
    });
    expect(result.fontSize).toBe(11);
    expect(result.lineHeight).toBe(1.4);
    expect(result.paragraphSpacing).toBe(10);
  });

  // The merged spec table carries the resume's fields too; iterating it
  // would leak sectionSpacing/entrySpacing into a letter settings object.
  it("never carries resume-only fields through", () => {
    const result = coerceCoverLetterExportSettings({
      sectionSpacing: 20,
      entrySpacing: 20,
      template: "professional",
    });
    expect(result).not.toHaveProperty("sectionSpacing");
    expect(result).not.toHaveProperty("entrySpacing");
    expect(result).not.toHaveProperty("template");
  });
});
