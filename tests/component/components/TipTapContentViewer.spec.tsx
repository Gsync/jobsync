import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import { joinAnswerHtml } from "@/lib/questions/answer";
import { renderAnswerMarkdown } from "@/lib/questions/renderAnswer";
import { render, waitFor } from "@testing-library/react";

describe("TipTapContentViewer", () => {
  it("shows a joined answer as two notes split by a rule", async () => {
    const { container } = render(
      <TipTapContentViewer
        content={joinAnswerHtml("<p>Saved note</p>", "<p>New note</p>")}
      />,
    );
    await waitFor(() => expect(container.querySelector("hr")).not.toBeNull());
    const hr = container.querySelector("hr")!;
    expect(hr.previousElementSibling).toHaveTextContent("Saved note");
    expect(hr.nextElementSibling).toHaveTextContent("New note");
  });

  it("highlights a fenced answer saved from AI chat", async () => {
    const { container } = render(
      <TipTapContentViewer
        content={renderAnswerMarkdown("```ts\nconst x = 1;\n```")}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector(".hljs-keyword")).toHaveTextContent(
        "const",
      ),
    );
    // auto-detect would also colour `const`; this proves the ts label survived
    expect(container.querySelector("pre > code.language-ts")).not.toBeNull();
  });

  it("shows code in an unknown language without failing", async () => {
    const { container } = render(
      <TipTapContentViewer
        content={'<pre><code class="language-nope">x = 1</code></pre>'}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector("pre")).toHaveTextContent("x = 1"),
    );
  });
});
