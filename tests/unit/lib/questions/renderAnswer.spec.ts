import { buildAnswerHtml, renderAnswerMarkdown } from "@/lib/questions/renderAnswer";

describe("renderAnswerMarkdown", () => {
  it("converts markdown to HTML", () => {
    expect(renderAnswerMarkdown("**bold** answer")).toContain("<strong>bold</strong>");
  });

  it("does not render raw HTML tags in the markdown input (html:false)", () => {
    expect(renderAnswerMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });
});

describe("buildAnswerHtml", () => {
  it("renders each answer and joins them with the separator", () => {
    const html = buildAnswerHtml(["first", "second"]);
    const first = html.indexOf("<p>first</p>");
    const hr = html.indexOf("<hr>");
    const second = html.indexOf("<p>second</p>");
    expect(first).toBeGreaterThanOrEqual(0);
    expect(hr).toBeGreaterThan(first);
    expect(second).toBeGreaterThan(hr);
  });
});
