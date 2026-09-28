import { describe, it, expect } from "vitest";
import {
  clampNumericField,
  formatSettingValue,
  PDF_FONT_LABELS,
  PDF_NUMERIC_SETTINGS,
  settingsKey,
} from "@/models/pdfExport.model";
import {
  defaultResumeExportSettings,
  RESUME_NUMERIC_FIELDS,
} from "@/models/resumeExport.model";

describe("defaultResumeExportSettings", () => {
  // Copied from simpleStyles, so buildSimpleStyles at the defaults is
  // identity. Professional's four deltas are documented in the plan.
  it("is Simple's own literals", () => {
    expect(defaultResumeExportSettings).toEqual({
      template: "simple",
      font: "helvetica",
      fontSize: 11,
      lineHeight: 1.4,
      marginVertical: 40,
      marginHorizontal: 48,
      sectionSpacing: 6,
      entrySpacing: 8,
      showPageNumbers: true,
    });
  });

  it("orders its keys template-first so the cache key is stable", () => {
    expect(Object.keys(defaultResumeExportSettings)).toEqual([
      "template",
      "font",
      "fontSize",
      "lineHeight",
      "marginVertical",
      "marginHorizontal",
      "sectionSpacing",
      "entrySpacing",
      "showPageNumbers",
    ]);
  });

  it("puts every default inside its own field's range", () => {
    for (const field of RESUME_NUMERIC_FIELDS) {
      const spec = PDF_NUMERIC_SETTINGS[field];
      const value = defaultResumeExportSettings[field];
      expect(value).toBeGreaterThanOrEqual(spec.min);
      expect(value).toBeLessThanOrEqual(spec.max);
    }
  });
});

describe("PDF_FONT_LABELS", () => {
  it("labels the three standard-14 families", () => {
    expect(PDF_FONT_LABELS).toEqual({
      helvetica: "Helvetica",
      times: "Times",
      courier: "Courier",
    });
  });
});

describe("PDF_NUMERIC_SETTINGS", () => {
  it("describes every numeric setting either document uses", () => {
    expect(Object.keys(PDF_NUMERIC_SETTINGS)).toEqual([
      "fontSize",
      "lineHeight",
      "marginVertical",
      "marginHorizontal",
      "sectionSpacing",
      "entrySpacing",
      "paragraphSpacing",
    ]);
  });

  it("gives font size half-point steps in points", () => {
    expect(PDF_NUMERIC_SETTINGS.fontSize).toEqual({
      label: "Font size",
      min: 8,
      max: 16,
      step: 0.5,
      decimals: 1,
      unit: "pt",
    });
  });

  it("gives line height a unitless two-decimal scale", () => {
    expect(PDF_NUMERIC_SETTINGS.lineHeight.unit).toBe("");
    expect(PDF_NUMERIC_SETTINGS.lineHeight.step).toBe(0.05);
    expect(PDF_NUMERIC_SETTINGS.lineHeight.decimals).toBe(2);
  });

  it("gives every field a step it can reach from its own default", () => {
    for (const field of RESUME_NUMERIC_FIELDS) {
      const spec = PDF_NUMERIC_SETTINGS[field];
      expect(spec.step).toBeGreaterThan(0);
      expect(spec.min).toBeLessThan(spec.max);
      expect(spec.label.length).toBeGreaterThan(0);
      expect(defaultResumeExportSettings[field]).toBeTypeOf("number");
    }
  });
});

describe("PDF_NUMERIC_SETTINGS vs RESUME_NUMERIC_FIELDS", () => {
  it("carries paragraphSpacing in the shared table", () => {
    expect(PDF_NUMERIC_SETTINGS.paragraphSpacing).toEqual({
      label: "Paragraph spacing",
      min: 0,
      max: 24,
      step: 1,
      decimals: 0,
      unit: "pt",
    });
  });

  // Iterating the merged table would add a paragraphSpacing key to every
  // resume settings object, which nothing on the resume side reads.
  it("keeps paragraphSpacing out of the resume's field list", () => {
    expect(RESUME_NUMERIC_FIELDS).toEqual([
      "fontSize",
      "lineHeight",
      "marginVertical",
      "marginHorizontal",
      "sectionSpacing",
      "entrySpacing",
    ]);
    expect(RESUME_NUMERIC_FIELDS).not.toContain("paragraphSpacing");
  });
});

describe("clampNumericField", () => {
  it("returns a value already in range unchanged", () => {
    expect(clampNumericField("fontSize", 12.5)).toBe(12.5);
    expect(clampNumericField("marginVertical", 40)).toBe(40);
  });

  it("clamps to the field's own bounds", () => {
    expect(clampNumericField("fontSize", 400)).toBe(16);
    expect(clampNumericField("fontSize", -3)).toBe(8);
    expect(clampNumericField("marginHorizontal", 1000)).toBe(90);
    expect(clampNumericField("sectionSpacing", -1)).toBe(0);
  });

  // 1.4 + 0.05 is 1.4500000000000002, which would poison both the style
  // sheet and the JSON.stringify preview cache key.
  it("rounds away IEEE-754 drift at the field's precision", () => {
    expect(clampNumericField("lineHeight", 1.4 + 0.05)).toBe(1.45);
    expect(clampNumericField("fontSize", 11 + 0.5)).toBe(11.5);
    expect(clampNumericField("marginVertical", 40.4)).toBe(40);
  });

  it("does not snap a typed value onto the step grid", () => {
    expect(clampNumericField("fontSize", 11.3)).toBe(11.3);
    expect(clampNumericField("marginVertical", 41)).toBe(41);
  });

  it("returns the caller's fallback for anything that is not a number", () => {
    for (const value of [null, undefined, "40", NaN, Infinity, {}, []]) {
      expect(clampNumericField("marginVertical", value, 40)).toBe(40);
    }
  });

  // The shared model must not know about resume templates, so with no
  // fallback a non-finite value lands on the field's own floor.
  it("falls back to the field's min when no fallback is given", () => {
    expect(clampNumericField("marginVertical", NaN)).toBe(18);
    expect(clampNumericField("fontSize", "nope")).toBe(8);
  });

  it("accepts 0 as a fallback rather than treating it as absent", () => {
    expect(clampNumericField("paragraphSpacing", NaN, 0)).toBe(0);
  });
});

describe("formatSettingValue", () => {
  it("renders a bare number, with a unit where the field has one", () => {
    expect(formatSettingValue("fontSize", 11)).toBe("11 pt");
    expect(formatSettingValue("fontSize", 11.5)).toBe("11.5 pt");
    expect(formatSettingValue("lineHeight", 1.4)).toBe("1.4");
    expect(formatSettingValue("lineHeight", 1.45)).toBe("1.45");
    expect(formatSettingValue("marginHorizontal", 48)).toBe("48 pt");
    expect(formatSettingValue("entrySpacing", 8)).toBe("8 pt");
  });
});

describe("settingsKey", () => {
  // This is what lets the rest of the code stop caring about key order.
  it("is the same string whatever order the keys were written in", () => {
    expect(settingsKey({ font: "times", fontSize: 12 })).toBe(
      settingsKey({ fontSize: 12, font: "times" }),
    );
  });

  it("still separates objects that differ in a value", () => {
    expect(settingsKey({ fontSize: 12 })).not.toBe(settingsKey({ fontSize: 13 }));
  });

  it("separates objects that differ in which keys they carry", () => {
    expect(settingsKey({ fontSize: 12 })).not.toBe(
      settingsKey({ fontSize: 12, paragraphSpacing: 10 }),
    );
  });
});
