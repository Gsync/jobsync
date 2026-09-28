import type { NumericSetting, PdfFont } from "./pdfExport.model";

export type ResumeLayout = "simple" | "professional";

export const RESUME_LAYOUT_LABELS: Record<ResumeLayout, string> = {
  simple: "Simple",
  professional: "Professional",
};

// The explicit list the resume's coercion iterates. Iterating the merged
// PDF_NUMERIC_SETTINGS table instead would write paragraphSpacing into a
// resume settings object, where nothing reads it and everything carries it.
export const RESUME_NUMERIC_FIELDS = [
  "fontSize",
  "lineHeight",
  "marginVertical",
  "marginHorizontal",
  "sectionSpacing",
  "entrySpacing",
] as const satisfies readonly NumericSetting[];

export type ResumeNumericSetting = (typeof RESUME_NUMERIC_FIELDS)[number];

export interface ResumeExportSettings {
  template: ResumeLayout;
  font: PdfFont;
  fontSize: number;
  lineHeight: number;
  marginVertical: number;
  marginHorizontal: number;
  sectionSpacing: number;
  entrySpacing: number;
  showPageNumbers: boolean;
}

// Each template's own literals, so building its styles at its own defaults
// is identity — the settings only ever move a template off what it shipped.
export const RESUME_TEMPLATE_DEFAULTS: Record<
  ResumeLayout,
  ResumeExportSettings
> = {
  simple: {
    template: "simple",
    font: "helvetica",
    fontSize: 11,
    lineHeight: 1.4,
    marginVertical: 40,
    marginHorizontal: 48,
    sectionSpacing: 6,
    entrySpacing: 8,
    showPageNumbers: true,
  },
  professional: {
    template: "professional",
    font: "helvetica",
    fontSize: 11,
    lineHeight: 1.45,
    marginVertical: 36,
    marginHorizontal: 44,
    sectionSpacing: 12,
    entrySpacing: 8,
    showPageNumbers: true,
  },
};

export const defaultResumeExportSettings = RESUME_TEMPLATE_DEFAULTS.simple;
