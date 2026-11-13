import { describe, it, expect } from "vitest";
import {
  defaultResumeExportSettings,
  RESUME_TEMPLATE_DEFAULTS,
} from "@/models/resumeExport.model";
import { buildSimpleStyles } from "@/components/profile/resume-pdf/styles/simple.styles";
import { buildProfessionalStyles } from "@/components/profile/resume-pdf/styles/professional.styles";

const simple = (patch: Partial<typeof defaultResumeExportSettings> = {}) =>
  buildSimpleStyles({ ...defaultResumeExportSettings, ...patch }).styles;

const professional = (
  patch: Partial<typeof defaultResumeExportSettings> = {},
) =>
  buildProfessionalStyles({ ...defaultResumeExportSettings, ...patch }).styles;

describe("buildSimpleStyles at the defaults", () => {
  const s = simple();

  // The defaults are copied from this sheet, so this is a hard identity.
  it("keeps the page exactly as the static sheet had it", () => {
    expect(s.page).toEqual({
      fontFamily: "Helvetica",
      fontSize: 11,
      paddingTop: 40,
      paddingBottom: 40,
      paddingHorizontal: 48,
      color: "#000000",
      lineHeight: 1.4,
    });
  });

  it("keeps the section title exactly as the static sheet had it", () => {
    expect(s.sectionTitle).toEqual({
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 3,
      marginTop: 6,
    });
  });

  it("keeps the remaining numbers unmoved", () => {
    expect(s.heading.fontSize).toBe(20);
    expect(s.heading.marginBottom).toBe(8);
    expect(s.subheading.fontSize).toBe(12);
    expect(s.contactLine.fontSize).toBe(10);
    expect(s.divider.marginBottom).toBe(6);
    expect(s.bodyText.fontSize).toBe(11);
    expect(s.entryTitle.fontSize).toBe(11);
    expect(s.entryMeta.fontSize).toBe(10);
    expect(s.bullet.width).toBe(14);
    expect(s.h2text.fontSize).toBe(13);
    expect(s.skillRow.marginBottom).toBe(3);
    expect(s.skillCat.width).toBe(110);
    expect(s.skillVals.fontSize).toBe(11);
  });

  it("carries the literals lifted out of SimpleTemplate", () => {
    expect(s.headerBlock.marginBottom).toBe(12);
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.certBlock.marginBottom).toBe(6);
    expect(s.contactRow).toEqual({ flexDirection: "row", flexWrap: "wrap" });
    expect(s.link).toEqual({ color: "#000000", textDecoration: "none" });
  });

  it("returns an html style set aliasing the sheet's own objects", () => {
    const { styles, htmlStyles } = buildSimpleStyles(defaultResumeExportSettings);
    expect(htmlStyles.bulletChar).toBe("•");
    expect(htmlStyles.bold).toBe(styles.bold);
  });
});

describe("buildProfessionalStyles at the defaults", () => {
  const s = professional();

  // One shared number cannot equal two templates' literals. These four are
  // the whole of Professional's sanctioned drift; see the plan's Context.
  it("takes the shared defaults where it used to differ", () => {
    expect(s.page.paddingTop).toBe(40); // was 36
    expect(s.page.paddingHorizontal).toBe(48); // was 44
    expect(s.page.lineHeight).toBe(1.4); // was 1.45
    expect(s.sectionHeadingRow.marginTop).toBe(6); // was 12
  });

  it("keeps everything else on the page exactly as it was", () => {
    expect(s.page.fontFamily).toBe("Helvetica");
    expect(s.page.fontSize).toBe(11);
    expect(s.page.paddingBottom).toBe(40);
    expect(s.page.color).toBe("#1a1a1a");
  });

  it("keeps the accent colour hardcoded and unscaled", () => {
    expect(s.sectionHeadingLabel.color).toBe("#34506e");
    expect(s.headline.color).toBe("#34506e");
    expect(s.bullet.color).toBe("#34506e");
    expect(s.sectionHeadingRule.borderBottomColor).toBe("#34506e");
  });

  it("keeps the remaining numbers unmoved", () => {
    expect(s.name.fontSize).toBe(24);
    expect(s.name.marginBottom).toBe(16);
    expect(s.headline.fontSize).toBe(12);
    expect(s.contactLine.fontSize).toBe(10);
    expect(s.thickRule.marginBottom).toBe(10);
    expect(s.sectionHeadingRow.marginBottom).toBe(6);
    expect(s.sectionHeadingLabel.marginRight).toBe(6);
    expect(s.entryDate.fontSize).toBe(10);
    expect(s.entryDate.marginLeft).toBe(8);
    expect(s.entryMeta.marginBottom).toBe(3);
    expect(s.bullet.width).toBe(12);
    expect(s.twoColRow.gap).toBe(20);
  });

  it("carries the literals lifted out of ProfessionalTemplate", () => {
    expect(s.summaryBlock.marginBottom).toBe(4);
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.certBlock.marginBottom).toBe(6);
    expect(s.skillTwoColRow).toEqual({
      flexDirection: "row",
      gap: 20,
      marginBottom: 4,
    });
    expect(s.skillCatLabel.fontSize).toBe(9);
    expect(s.skillVals.fontSize).toBe(10);
    expect(s.link).toEqual({ color: "#1a1a1a", textDecoration: "none" });
  });

  it("returns an html style set with the professional bullet char", () => {
    const { htmlStyles } = buildProfessionalStyles(defaultResumeExportSettings);
    expect(htmlStyles.bulletChar).toBe("•");
  });

  // Guards the regression the settings work introduced once: Professional
  // reading Simple's defaults silently restyled every existing export.
  it("reproduces its own shipped literals at its own defaults", () => {
    const s = buildProfessionalStyles(
      RESUME_TEMPLATE_DEFAULTS.professional,
    ).styles;
    expect(s.page.paddingTop).toBe(36);
    expect(s.page.paddingHorizontal).toBe(44);
    expect(s.page.lineHeight).toBe(1.45);
    expect(s.sectionHeadingRow.marginTop).toBe(12);
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.certBlock.marginBottom).toBe(6);
  });
});

describe("the font setting", () => {
  it("swaps every Simple face to the Times quartet", () => {
    const s = simple({ font: "times" });
    expect(s.page.fontFamily).toBe("Times-Roman");
    expect(s.bold.fontFamily).toBe("Times-Bold");
    expect(s.italic.fontFamily).toBe("Times-Italic");
    expect(s.boldItalic.fontFamily).toBe("Times-BoldItalic");
    expect(s.heading.fontFamily).toBe("Times-Bold");
    expect(s.sectionTitle.fontFamily).toBe("Times-Bold");
    expect(s.entryTitle.fontFamily).toBe("Times-Bold");
    expect(s.h2text.fontFamily).toBe("Times-Bold");
    expect(s.skillCat.fontFamily).toBe("Times-Bold");
  });

  it("swaps every Professional face to the Courier quartet", () => {
    const s = professional({ font: "courier" });
    expect(s.page.fontFamily).toBe("Courier");
    expect(s.bold.fontFamily).toBe("Courier-Bold");
    expect(s.italic.fontFamily).toBe("Courier-Oblique");
    expect(s.boldItalic.fontFamily).toBe("Courier-BoldOblique");
    expect(s.name.fontFamily).toBe("Courier-Bold");
    expect(s.headline.fontFamily).toBe("Courier");
    expect(s.contactLine.fontFamily).toBe("Courier");
    expect(s.sectionHeadingLabel.fontFamily).toBe("Courier-Bold");
    expect(s.entryTitle.fontFamily).toBe("Courier-Bold");
    expect(s.entryTitleBlock.fontFamily).toBe("Courier-Bold");
    expect(s.entryDate.fontFamily).toBe("Courier");
    expect(s.h2text.fontFamily).toBe("Courier-Bold");
    expect(s.skillCatLabel.fontFamily).toBe("Courier-Bold");
  });

  it("leaves every number alone", () => {
    const s = simple({ font: "courier" });
    expect(s.page.fontSize).toBe(11);
    expect(s.page.paddingHorizontal).toBe(48);
    expect(s.page.lineHeight).toBe(1.4);
    expect(s.entryBlock.marginBottom).toBe(8);
  });
});

describe("the fontSize setting", () => {
  // The base is assigned, not scaled, so a half point survives intact.
  it("puts the exact value on every base-size property", () => {
    const s = simple({ fontSize: 11.5 });
    expect(s.page.fontSize).toBe(11.5);
    expect(s.bodyText.fontSize).toBe(11.5);
    expect(s.sectionTitle.fontSize).toBe(11.5);
    expect(s.entryTitle.fontSize).toBe(11.5);
    expect(s.listText.fontSize).toBe(11.5);
    expect(s.skillVals.fontSize).toBe(11.5);
    expect(s.bullet.fontSize).toBe(11.5);
  });

  it("puts the exact value on Professional's base-size properties too", () => {
    const s = professional({ fontSize: 9.5 });
    expect(s.page.fontSize).toBe(9.5);
    expect(s.sectionHeadingLabel.fontSize).toBe(9.5);
    expect(s.entryTitleBlock.fontSize).toBe(9.5);
    expect(s.listText.fontSize).toBe(9.5);
  });

  it("scales the Simple derived sizes proportionally", () => {
    const s = simple({ fontSize: 13 });
    expect(s.heading.fontSize).toBe(23.6); // 20 * 13/11
    expect(s.subheading.fontSize).toBe(14.2);
    expect(s.contactLine.fontSize).toBe(11.8);
    expect(s.h2text.fontSize).toBe(15.4);
  });

  it("scales the Professional derived sizes proportionally", () => {
    const s = professional({ fontSize: 8 });
    expect(s.name.fontSize).toBe(17.5); // 24 * 8/11
    expect(s.headline.fontSize).toBe(8.7);
    expect(s.skillCatLabel.fontSize).toBe(6.5);
  });

  it("scales the two font-metric widths with the text", () => {
    expect(simple({ fontSize: 13 }).skillCat.width).toBeGreaterThan(110);
    expect(simple({ fontSize: 9 }).bullet.width).toBeLessThan(14);
    expect(professional({ fontSize: 9 }).bullet.width).toBeLessThan(12);
  });

  it("leaves every margin, gap and line height alone", () => {
    const s = simple({ fontSize: 16 });
    expect(s.page.paddingHorizontal).toBe(48);
    expect(s.page.lineHeight).toBe(1.4);
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.sectionTitle.marginTop).toBe(6);
    expect(s.divider.marginBottom).toBe(6);
  });
});

describe("the lineHeight setting", () => {
  it("assigns the exact value to the page and nothing else", () => {
    const s = simple({ lineHeight: 1.75 });
    expect(s.page.lineHeight).toBe(1.75);
    expect(s.page.fontSize).toBe(11);
    expect(s.page.paddingHorizontal).toBe(48);
    expect(s.entryBlock.marginBottom).toBe(8);
  });

  it("gives both templates the same value now", () => {
    expect(professional({ lineHeight: 1.2 }).page.lineHeight).toBe(
      simple({ lineHeight: 1.2 }).page.lineHeight,
    );
  });
});

describe("the margin settings", () => {
  it("assigns the vertical value to top and bottom, and nothing else", () => {
    const s = simple({ marginVertical: 24 });
    expect(s.page.paddingTop).toBe(24);
    expect(s.page.paddingBottom).toBe(24);
    expect(s.page.paddingHorizontal).toBe(48);
  });

  it("assigns the horizontal value to paddingHorizontal only", () => {
    const s = professional({ marginHorizontal: 72 });
    expect(s.page.paddingHorizontal).toBe(72);
    expect(s.page.paddingTop).toBe(40);
    expect(s.page.fontSize).toBe(11);
  });

  // Margins are page padding. They must not leak into block spacing.
  it("leaves every block gap alone", () => {
    const s = simple({ marginVertical: 90, marginHorizontal: 18 });
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.sectionTitle.marginTop).toBe(6);
    expect(s.headerBlock.marginBottom).toBe(12);
  });
});

describe("the sectionSpacing setting", () => {
  it("sets the gap above a Simple section heading", () => {
    expect(simple({ sectionSpacing: 20 }).sectionTitle.marginTop).toBe(20);
    expect(simple({ sectionSpacing: 0 }).sectionTitle.marginTop).toBe(0);
  });

  it("sets the gap above a Professional section heading", () => {
    expect(
      professional({ sectionSpacing: 20 }).sectionHeadingRow.marginTop,
    ).toBe(20);
  });

  it("touches nothing else", () => {
    const s = simple({ sectionSpacing: 32 });
    expect(s.sectionTitle.marginBottom).toBe(3);
    expect(s.divider.marginBottom).toBe(6);
    expect(s.entryBlock.marginBottom).toBe(8);
    expect(s.page.paddingTop).toBe(40);
    expect(s.h2text.marginTop).toBe(4);
  });
});

describe("the entrySpacing setting", () => {
  it("sets the entry gap in both templates", () => {
    expect(simple({ entrySpacing: 14 }).entryBlock.marginBottom).toBe(14);
    expect(professional({ entrySpacing: 14 }).entryBlock.marginBottom).toBe(14);
  });

  it("derives the certificate gap at three quarters", () => {
    expect(simple({ entrySpacing: 12 }).certBlock.marginBottom).toBe(9);
    expect(professional({ entrySpacing: 12 }).certBlock.marginBottom).toBe(9);
    expect(simple({ entrySpacing: 0 }).certBlock.marginBottom).toBe(0);
  });

  it("touches nothing else", () => {
    const s = professional({ entrySpacing: 24 });
    expect(s.summaryBlock.marginBottom).toBe(4);
    expect(s.entryMeta.marginBottom).toBe(3);
    expect(s.name.marginBottom).toBe(16);
    expect(s.sectionHeadingRow.marginTop).toBe(6);
    expect(s.page.paddingTop).toBe(40);
  });
});

describe("what no setting may reach", () => {
  // Horizontal measurements are not spacing controls, and rule weights are
  // not spacing at all. Both stay literal under every setting.
  it("leaves horizontal gutters and rule weights alone", () => {
    for (const s of [
      professional({ sectionSpacing: 32, entrySpacing: 32, fontSize: 16 }),
      professional({ sectionSpacing: 0, entrySpacing: 0, fontSize: 8 }),
    ]) {
      expect(s.twoColRow.gap).toBe(20);
      expect(s.skillTwoColRow.gap).toBe(20);
      expect(s.entryDate.marginLeft).toBe(8);
      expect(s.sectionHeadingLabel.marginRight).toBe(6);
      expect(s.thickRule.borderBottomWidth).toBe(2);
      expect(s.sectionHeadingRule.borderBottomWidth).toBe(0.75);
    }
    expect(simple({ fontSize: 16 }).divider.borderBottomWidth).toBe(0.5);
    expect(simple({ fontSize: 16 }).sectionTitle.letterSpacing).toBe(0.8);
  });
});
