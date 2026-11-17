import { describe, it, expect } from "vitest";
import { defaultResumeExportSettings } from "@/models/resumeExport.model";
import {
  BASE_FONT_SIZE,
  FONT_QUARTETS,
} from "@/components/pdf-export/tokens";
import { resumeStyleTokens } from "@/components/profile/resume-pdf/styles/tokens";

const tokens = (patch: Partial<typeof defaultResumeExportSettings> = {}) =>
  resumeStyleTokens({ ...defaultResumeExportSettings, ...patch });

describe("FONT_QUARTETS", () => {
  it("names all four faces of each standard-14 family", () => {
    expect(FONT_QUARTETS.helvetica).toEqual({
      regular: "Helvetica",
      bold: "Helvetica-Bold",
      italic: "Helvetica-Oblique",
      boldItalic: "Helvetica-BoldOblique",
    });
    expect(FONT_QUARTETS.courier).toEqual({
      regular: "Courier",
      bold: "Courier-Bold",
      italic: "Courier-Oblique",
      boldItalic: "Courier-BoldOblique",
    });
  });

  // The regular Times face is Times-Roman; "Times" is not a registered name.
  it("uses Times-Roman for the regular Times face", () => {
    expect(FONT_QUARTETS.times.regular).toBe("Times-Roman");
    expect(FONT_QUARTETS.times.italic).toBe("Times-Italic");
  });
});

describe("styleTokens at the defaults", () => {
  const t = tokens();

  it("passes every setting straight through", () => {
    expect(t.fontSize).toBe(11);
    expect(t.lineHeight).toBe(1.4);
    expect(t.marginVertical).toBe(40);
    expect(t.marginHorizontal).toBe(48);
    expect(t.sectionSpacing).toBe(6);
    expect(t.entrySpacing).toBe(8);
    expect(t.font).toBe(FONT_QUARTETS.helvetica);
  });

  // Identity, not "rounds to the same number": this is what makes
  // buildSimpleStyles at the defaults reproduce the old sheet exactly.
  it("returns every derived literal untouched", () => {
    for (const literal of [9, 10, 11, 12, 13, 14, 20, 24, 110, 0.8, 1.4]) {
      expect(t.pt(literal)).toBe(literal);
    }
  });

  it("derives certificate spacing at three quarters of an entry gap", () => {
    expect(t.certSpacing).toBe(6);
  });
});

describe("the fontSize setting", () => {
  it("assigns the base rather than scaling it", () => {
    expect(tokens({ fontSize: 11.5 }).fontSize).toBe(11.5);
    expect(tokens({ fontSize: 8 }).fontSize).toBe(8);
  });

  it("scales derived sizes proportionally, to one decimal", () => {
    const t = tokens({ fontSize: 11.5 });
    expect(t.pt(20)).toBe(20.9);
    expect(t.pt(110)).toBe(115);
    expect(t.pt(10)).toBe(10.5);
  });

  it("scales down as well as up", () => {
    const t = tokens({ fontSize: 8 });
    expect(t.pt(110)).toBe(80);
    expect(t.pt(24)).toBe(17.5);
  });

  it("is proportional to the base the sheets are written against", () => {
    expect(BASE_FONT_SIZE).toBe(11);
    expect(tokens({ fontSize: 16 }).pt(BASE_FONT_SIZE)).toBe(16);
  });

  it("leaves every spacing token alone", () => {
    const t = tokens({ fontSize: 16 });
    expect(t.lineHeight).toBe(1.4);
    expect(t.marginHorizontal).toBe(48);
    expect(t.entrySpacing).toBe(8);
  });
});

describe("the spacing settings", () => {
  it("passes section and entry spacing through untouched", () => {
    const t = tokens({ sectionSpacing: 20, entrySpacing: 12 });
    expect(t.sectionSpacing).toBe(20);
    expect(t.entrySpacing).toBe(12);
  });

  it("keeps certificate spacing a whole number below the entry gap", () => {
    expect(tokens({ entrySpacing: 12 }).certSpacing).toBe(9);
    expect(tokens({ entrySpacing: 0 }).certSpacing).toBe(0);
    expect(tokens({ entrySpacing: 3 }).certSpacing).toBe(2);
  });

  it("leaves font metrics alone", () => {
    expect(tokens({ sectionSpacing: 32 }).pt(20)).toBe(20);
  });
});

describe("the font setting", () => {
  it("selects the quartet without touching any number", () => {
    const t = tokens({ font: "times" });
    expect(t.font.bold).toBe("Times-Bold");
    expect(t.fontSize).toBe(11);
    expect(t.marginVertical).toBe(40);
  });
});
