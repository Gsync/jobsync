import { describe, expect, it } from "vitest";
import {
  getDescriptionExcerpt,
  hasDescription,
  toPlainText,
} from "@/lib/tasks/description";

describe("toPlainText", () => {
  it("returns empty string for null/undefined/empty input", () => {
    expect(toPlainText(null)).toBe("");
    expect(toPlainText(undefined)).toBe("");
    expect(toPlainText("")).toBe("");
  });

  it("strips tags and collapses whitespace", () => {
    expect(toPlainText("<p>Call <strong>Jane</strong> back</p>")).toBe(
      "Call Jane back",
    );
  });

  it("joins block-level content with a space", () => {
    expect(toPlainText("<p>First</p><p>Second</p>")).toBe("First Second");
  });

  it("decodes non-breaking spaces to whitespace", () => {
    expect(toPlainText("<p>a&nbsp;b</p>")).toBe("a b");
  });

  it("decodes HTML entities like &amp; back to their characters", () => {
    expect(toPlainText("<p>Sales &amp; Marketing</p>")).toBe(
      "Sales & Marketing",
    );
  });
});

describe("hasDescription", () => {
  it("is false for the empty Tiptap document", () => {
    expect(hasDescription("<p></p>")).toBe(false);
  });

  it("is false for a whitespace-only Tiptap document", () => {
    expect(hasDescription("<p>&nbsp;</p>")).toBe(false);
    expect(hasDescription("<p>   </p>")).toBe(false);
  });

  it("is false for null/undefined/empty input", () => {
    expect(hasDescription(null)).toBe(false);
    expect(hasDescription(undefined)).toBe(false);
    expect(hasDescription("")).toBe(false);
  });

  it("is true when there is real content", () => {
    expect(hasDescription("<p>Prep interview notes</p>")).toBe(true);
  });

  it("is true for content held only in a list item", () => {
    expect(hasDescription("<ul><li>Follow up</li></ul>")).toBe(true);
  });
});

describe("getDescriptionExcerpt", () => {
  it("returns the full text when under the limit", () => {
    expect(getDescriptionExcerpt("<p>Short note</p>")).toBe("Short note");
  });

  it("returns text untruncated at exactly the limit", () => {
    const text = "a".repeat(200);
    expect(getDescriptionExcerpt(`<p>${text}</p>`)).toBe(text);
  });

  it("truncates and appends an ellipsis past the limit", () => {
    const excerpt = getDescriptionExcerpt(`<p>${"a".repeat(201)}</p>`);
    expect(excerpt).toBe(`${"a".repeat(200)}…`);
    expect(excerpt).toHaveLength(201);
  });

  it("does not leave a dangling space before the ellipsis", () => {
    const html = `<p>${"a".repeat(199)} trailing words</p>`;
    expect(getDescriptionExcerpt(html)).toBe(`${"a".repeat(199)}…`);
  });

  it("returns empty string for an empty description", () => {
    expect(getDescriptionExcerpt("<p></p>")).toBe("");
  });
});
