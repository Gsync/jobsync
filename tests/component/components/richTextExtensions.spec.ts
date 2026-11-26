import { richTextExtensions } from "@/components/richTextExtensions";
import { Editor } from "@tiptap/react";

const block = '<pre><code class="language-typescript">const x = 1;</code></pre>';

describe("richTextExtensions", () => {
  let editor: Editor | undefined;

  afterEach(() => editor?.destroy());

  it("stores code blocks without highlight markup", () => {
    editor = new Editor({ extensions: richTextExtensions, content: block });
    expect(editor.getHTML()).toBe(block);
  });

  it("decorates a known language with hljs classes", () => {
    editor = new Editor({ extensions: richTextExtensions, content: block });
    expect(editor.view.dom.querySelector(".hljs-keyword")).toHaveTextContent(
      "const",
    );
  });
});
