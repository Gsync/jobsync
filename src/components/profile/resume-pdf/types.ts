export type ResumeLayout = "simple" | "professional";

export const RESUME_LAYOUT_LABELS: Record<ResumeLayout, string> = {
  simple: "Simple",
  professional: "Professional",
};

export type HtmlStyleSet = {
  bodyText: object;
  bold: object;
  italic: object;
  boldItalic: object;
  h2text: object;
  listRow: object;
  bullet: object;
  listText: object;
  bulletChar: string;
};
