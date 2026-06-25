import { describe, it, expect } from "vitest";
import { sanitizeFilename, RESUME_LAYOUT_LABELS } from "@/components/profile/resume-pdf";

// DOMParser is available in jsdom (vitest environment)
import { htmlToPdfNodes } from "@/components/profile/resume-pdf/html-to-pdf";
import type { HtmlStyleSet } from "@/components/profile/resume-pdf/types";

// Minimal style sets — avoid @react-pdf StyleSheet.create in test env
const simpleStyleSet: HtmlStyleSet = {
  bodyText: {},
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  boldItalic: { fontFamily: "Helvetica-BoldOblique" },
  h2text: {},
  listRow: {},
  bullet: {},
  listText: {},
  bulletChar: "•",
};

const professionalStyleSet: HtmlStyleSet = {
  ...simpleStyleSet,
  bulletChar: "▪",
};

describe("sanitizeFilename", () => {
  it("returns 'resume' for empty string", () => {
    expect(sanitizeFilename("")).toBe("resume");
  });

  it("returns 'resume' for string of only unsafe chars", () => {
    expect(sanitizeFilename('???/\\:*?"<>|')).toBe("resume");
  });

  it("strips null bytes and control characters", () => {
    expect(sanitizeFilename("my\x00resume\x1f")).toBe("myresume");
  });

  it("truncates to 200 chars", () => {
    const long = "a".repeat(250);
    expect(sanitizeFilename(long)).toHaveLength(200);
  });

  it("leaves a clean string unchanged", () => {
    expect(sanitizeFilename("Senior Backend Resume")).toBe(
      "Senior Backend Resume",
    );
  });

  it("collapses extra whitespace", () => {
    expect(sanitizeFilename("Senior   Backend  Resume")).toBe(
      "Senior Backend Resume",
    );
  });
});

describe("htmlToPdfNodes", () => {
  it("returns [] for empty string", () => {
    expect(htmlToPdfNodes("")).toHaveLength(0);
  });

  it("returns [] for whitespace-only string", () => {
    expect(htmlToPdfNodes("   ")).toHaveLength(0);
  });

  it("produces a node for a <p> tag", () => {
    const nodes = htmlToPdfNodes("<p>Hello world</p>");
    expect(nodes).toHaveLength(1);
    const props = nodes[0].props as { children?: unknown };
    expect(props.children).toContain("Hello world");
  });

  it("applies both bold and italic for <strong><em> nesting", () => {
    const nodes = htmlToPdfNodes("<p><strong><em>bold italic</em></strong></p>");
    expect(nodes).toHaveLength(1);
    // The nested Text should carry boldItalic style
    const inner = JSON.stringify(nodes[0]);
    expect(inner).toContain("Helvetica-BoldOblique");
  });

  it("produces bullet rows for <ul><li>", () => {
    const nodes = htmlToPdfNodes("<ul><li>Item 1</li><li>Item 2</li></ul>");
    expect(nodes).toHaveLength(1);
    const serialized = JSON.stringify(nodes[0]);
    expect(serialized).toContain("•");
  });

  it("falls through on unknown tags and renders children", () => {
    const nodes = htmlToPdfNodes("<div><p>visible</p></div>");
    expect(nodes.length).toBeGreaterThan(0);
    expect(JSON.stringify(nodes)).toContain("visible");
  });

  it("wraps top-level plain text with no block wrapper", () => {
    const nodes = htmlToPdfNodes("Motivated developer with experience.");
    expect(nodes).toHaveLength(1);
    expect(JSON.stringify(nodes[0])).toContain(
      "Motivated developer with experience.",
    );
  });
});

describe("RESUME_LAYOUT_LABELS", () => {
  it("maps 'simple' to 'Simple'", () => {
    expect(RESUME_LAYOUT_LABELS["simple"]).toBe("Simple");
  });

  it("maps 'professional' to 'Professional'", () => {
    expect(RESUME_LAYOUT_LABELS["professional"]).toBe("Professional");
  });

  it("covers exactly the two expected layouts", () => {
    expect(Object.keys(RESUME_LAYOUT_LABELS)).toEqual(["simple", "professional"]);
  });
});

describe("htmlToPdfNodes — layout style sets", () => {
  it("uses the simple bullet char (•) for list items", () => {
    const nodes = htmlToPdfNodes("<ul><li>Foo</li></ul>", simpleStyleSet);
    expect(JSON.stringify(nodes)).toContain("•");
  });

  it("uses the professional bullet char (▪) for list items", () => {
    const nodes = htmlToPdfNodes("<ul><li>Foo</li></ul>", professionalStyleSet);
    expect(JSON.stringify(nodes)).toContain("▪");
    expect(JSON.stringify(nodes)).not.toContain("•");
  });

  it("renders <h2> and includes its text content", () => {
    const nodes = htmlToPdfNodes("<h2>Skills</h2>", simpleStyleSet);
    expect(nodes).toHaveLength(1);
    expect(JSON.stringify(nodes[0])).toContain("Skills");
  });

  it("renders <ol> with incrementing numeric markers", () => {
    const nodes = htmlToPdfNodes(
      "<ol><li>First</li><li>Second</li></ol>",
      simpleStyleSet,
    );
    expect(nodes).toHaveLength(1);
    const serialized = JSON.stringify(nodes[0]);
    expect(serialized).toContain("1.");
    expect(serialized).toContain("2.");
    expect(serialized).not.toContain("•");
  });

  it("renders <br> as a newline within paragraph text", () => {
    const nodes = htmlToPdfNodes("<p>line one<br/>line two</p>", simpleStyleSet);
    expect(nodes).toHaveLength(1);
    // JSON.stringify encodes the \n character as \\n
    expect(JSON.stringify(nodes)).toContain("\\n");
  });

  it("renders <strong> with bold font and no italic", () => {
    const nodes = htmlToPdfNodes(
      "<p><strong>bold text</strong></p>",
      simpleStyleSet,
    );
    expect(nodes).toHaveLength(1);
    const serialized = JSON.stringify(nodes[0]);
    expect(serialized).toContain("Helvetica-Bold");
    expect(serialized).not.toContain("Oblique");
  });

  it("renders <em> with italic font and no bold", () => {
    const nodes = htmlToPdfNodes(
      "<p><em>italic text</em></p>",
      simpleStyleSet,
    );
    expect(nodes).toHaveLength(1);
    const serialized = JSON.stringify(nodes[0]);
    expect(serialized).toContain("Helvetica-Oblique");
    expect(serialized).not.toContain("Bold");
  });
});
