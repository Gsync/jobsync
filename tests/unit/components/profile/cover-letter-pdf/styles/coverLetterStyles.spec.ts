import { describe, it, expect } from "vitest";
import { defaultCoverLetterExportSettings } from "@/models/coverLetterExport.model";
import { buildLetterStyles } from "@/components/profile/cover-letter-pdf/styles/letter.styles";

const letter = (
  patch: Partial<typeof defaultCoverLetterExportSettings> = {},
) => buildLetterStyles({ ...defaultCoverLetterExportSettings, ...patch });

describe("buildLetterStyles at the defaults", () => {
  const s = letter().styles;

  it("keeps the page as the shipped sheet has it", () => {
    expect(s.page).toEqual({
      fontFamily: "Helvetica",
      fontSize: 11,
      paddingTop: 54,
      paddingBottom: 54,
      paddingHorizontal: 54,
      color: "#000000",
      lineHeight: 1.4,
    });
  });

  it("sizes the letterhead off the base", () => {
    expect(s.name.fontSize).toBe(16);
    expect(s.name.fontFamily).toBe("Helvetica-Bold");
    expect(s.headline.fontSize).toBe(11);
    expect(s.contactLine.fontSize).toBe(10);
    expect(s.contactLine.color).toBe("#444444");
  });

  it("gives the date the base size", () => {
    expect(s.date.fontSize).toBe(11);
  });

  it("puts paragraphSpacing on bodyText.marginBottom", () => {
    expect(s.bodyText).toEqual({ fontSize: 11, marginBottom: 10 });
  });

  it("exposes the full HtmlStyleSet so a hand-edited letter still renders", () => {
    const { htmlStyles } = letter();
    expect(Object.keys(htmlStyles).sort()).toEqual(
      [
        "bodyText",
        "bold",
        "boldItalic",
        "bullet",
        "bulletChar",
        "h2text",
        "italic",
        "listRow",
        "listText",
      ].sort(),
    );
    expect(htmlStyles.bulletChar).toBe("•");
    expect(htmlStyles.bold.fontFamily).toBe("Helvetica-Bold");
  });
});

describe("the settings reach exactly the properties they own", () => {
  // The base size is assigned, never scaled through pt, so a half-point
  // setting survives intact.
  it("assigns a half-point font size rather than rounding it", () => {
    const s = letter({ fontSize: 11.5 }).styles;
    expect(s.page.fontSize).toBe(11.5);
    expect(s.bodyText.fontSize).toBe(11.5);
    expect(s.date.fontSize).toBe(11.5);
  });

  it("scales only the derived sizes with the base", () => {
    const s = letter({ fontSize: 22 }).styles;
    expect(s.name.fontSize).toBe(32);
    expect(s.contactLine.fontSize).toBe(20);
  });

  // The mirror of the resume rule: a spacing setting reaches its own
  // properties and no others.
  it("moves nothing but bodyText.marginBottom when paragraphSpacing changes", () => {
    const base = letter().styles;
    const wide = letter({ paragraphSpacing: 24 }).styles;

    expect(wide.bodyText.marginBottom).toBe(24);
    for (const key of Object.keys(base) as (keyof typeof base)[]) {
      if (key === "bodyText") continue;
      expect(wide[key]).toEqual(base[key]);
    }
  });

  it("drives the page padding from the two margin settings", () => {
    const s = letter({ marginVertical: 72, marginHorizontal: 36 }).styles;
    expect(s.page.paddingTop).toBe(72);
    expect(s.page.paddingBottom).toBe(72);
    expect(s.page.paddingHorizontal).toBe(36);
  });

  it("switches the whole font quartet", () => {
    const s = letter({ font: "times" }).styles;
    expect(s.page.fontFamily).toBe("Times-Roman");
    expect(s.name.fontFamily).toBe("Times-Bold");
    expect(s.italic.fontFamily).toBe("Times-Italic");
  });
});
