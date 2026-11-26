import Tiptap from "@/components/TiptapEditor";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControllerRenderProps } from "react-hook-form";

// Tiptap measures selections through Range, which jsdom leaves unimplemented
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = vi.fn().mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  });
  range.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: vi.fn(),
  });
  return range;
};

const makeField = (value: string) =>
  ({
    value,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name: "d",
    ref: vi.fn(),
  }) as unknown as ControllerRenderProps<any, any>;

const editorHtml = (container: HTMLElement) =>
  container.querySelector(".ProseMirror")!.innerHTML;

describe("TiptapEditor", () => {
  it("toolbar Bold toggle shows pressed after click", async () => {
    const user = userEvent.setup();
    render(<Tiptap field={makeField("<p>hello</p>")} />);
    const [bold] = await screen.findAllByRole("button");
    expect(bold).toHaveAttribute("aria-pressed", "false");
    await user.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "true"));
  });

  it("mounting with content does not call onChange", async () => {
    const field = makeField("<ul><li><p>a</p></li></ul>");
    render(<Tiptap field={field} />);
    await screen.findAllByRole("button");
    await new Promise((r) => setTimeout(r, 50));
    expect(field.onChange).not.toHaveBeenCalled();
  });

  it("editor drops link, underline and trailing paragraph", async () => {
    const { container } = render(
      <Tiptap
        field={makeField(
          '<p><a href="https://x.test">x</a> <u>u</u> end</p><ul><li><p>a</p></li></ul>',
        )}
      />,
    );
    await screen.findAllByRole("button");
    expect(editorHtml(container)).toBe(
      '<p>x u end</p><ul class="list-disc pl-4"><li><p>a</p></li></ul>',
    );
  });
});

describe("TiptapEditor code blocks", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  // jsdom has no caret, so place the DOM selection and let ProseMirror read it
  const placeCaretIn = (el: Element) => {
    const pm = el.closest(".ProseMirror") as HTMLElement;
    pm.focus();
    document.getSelection()!.collapse(el.firstChild ?? el, 0);
    document.dispatchEvent(new Event("selectionchange"));
  };

  it("offers no code block toggle by default", async () => {
    render(<Tiptap field={makeField("<p>hello</p>")} />);
    await screen.findAllByRole("button");
    expect(screen.queryByRole("button", { name: "Code block" })).toBeNull();
  });

  it("code block toggle wraps the paragraph and reveals the language picker", async () => {
    const user = userEvent.setup();
    const field = makeField("<p>hello</p>");
    render(<Tiptap field={field} codeBlocks />);
    const toggle = await screen.findByRole("button", { name: "Code block" });
    expect(screen.queryByLabelText("Code language")).toBeNull();
    await user.click(toggle);
    expect(field.onChange).toHaveBeenLastCalledWith(
      "<pre><code>hello</code></pre>",
    );
    expect(screen.getByLabelText("Code language")).toBeInTheDocument();
  });

  it("picking a language sets its class", async () => {
    const user = userEvent.setup();
    const field = makeField("<pre><code>hello</code></pre>");
    const { container } = render(<Tiptap field={field} codeBlocks />);
    await screen.findAllByRole("button");
    placeCaretIn(container.querySelector(".ProseMirror pre code")!);
    await user.click(await screen.findByLabelText("Code language"));
    await user.click(screen.getByRole("option", { name: "TypeScript" }));
    expect(field.onChange).toHaveBeenLastCalledWith(
      '<pre><code class="language-typescript">hello</code></pre>',
    );
  });

  it("Auto-detect clears the language", async () => {
    const user = userEvent.setup();
    const field = makeField(
      '<pre><code class="language-typescript">hello</code></pre>',
    );
    const { container } = render(<Tiptap field={field} codeBlocks />);
    await screen.findAllByRole("button");
    placeCaretIn(container.querySelector(".ProseMirror pre code")!);
    await user.click(await screen.findByLabelText("Code language"));
    await user.click(screen.getByRole("option", { name: "Auto-detect" }));
    expect(field.onChange).toHaveBeenLastCalledWith(
      "<pre><code>hello</code></pre>",
    );
  });

  it("shows the placeholder after moving from a typescript block into a ts block", async () => {
    const { container } = render(
      <Tiptap
        field={makeField(
          '<pre><code class="language-typescript">a</code></pre><p>x</p><pre><code class="language-ts">b</code></pre>',
        )}
        codeBlocks
      />,
    );
    await screen.findAllByRole("button");
    const [first, second] = container.querySelectorAll(".ProseMirror pre code");
    placeCaretIn(first);
    await waitFor(() =>
      expect(screen.getByLabelText("Code language")).toHaveTextContent(
        "TypeScript",
      ),
    );
    placeCaretIn(second);
    await waitFor(() =>
      expect(screen.getByLabelText("Code language")).toHaveTextContent(
        "Language",
      ),
    );
  });
});

describe("TipTapContentViewer", () => {
  it("viewer renders links and underline as plain text", async () => {
    const { container } = render(
      <TipTapContentViewer
        content={'<p><a href="https://x.test">x</a> <u>u</u></p>'}
      />,
    );
    await waitFor(() => expect(container).toHaveTextContent("x u"));
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("u")).toBeNull();
  });

  it("viewer adds no trailing paragraph after a list", async () => {
    const { container } = render(
      <TipTapContentViewer content={"<ul><li><p>a</p></li></ul>"} />,
    );
    await waitFor(() => expect(container).toHaveTextContent("a"));
    expect(editorHtml(container)).toBe(
      '<ul class="list-disc pl-4"><li><p>a</p></li></ul>',
    );
  });
});
