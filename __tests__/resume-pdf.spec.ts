import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "@/components/profile/resume-pdf";

// DOMParser is available in jsdom (vitest environment)
import { htmlToPdfNodes } from "@/components/profile/resume-pdf/html-to-pdf";

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
    expect(nodes[0].props?.children).toContain("Hello world");
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
