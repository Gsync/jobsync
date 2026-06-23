import type { Style } from "@react-pdf/types";

export type ResumeLayout = "simple" | "professional";

export const RESUME_LAYOUT_LABELS: Record<ResumeLayout, string> = {
  simple: "Simple",
  professional: "Professional",
};

export type HtmlStyleSet = {
  bodyText: Style;
  bold: Style;
  italic: Style;
  boldItalic: Style;
  h2text: Style;
  listRow: Style;
  bullet: Style;
  listText: Style;
  bulletChar: string;
};
