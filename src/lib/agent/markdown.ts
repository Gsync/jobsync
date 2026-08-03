import MarkdownIt from "markdown-it";
import { stripThinking } from "@/lib/ai/stripThinking";

// Isomorphic: no server-only, no fetch. The transcript imports it from a
// client component.

// html:false escapes raw HTML; TipTapContentViewer strips unrecognized tags
// after this. The disabled rules are the security property, not a style
// choice: a markdown link or image is a network request the user never
// chose, from output an injected posting can influence. Disabled here means
// the URL still renders, as inert text.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });
md.disable(["image", "link", "autolink"]);

export function renderAgentMarkdown(text: string): string {
  const clean = stripThinking(text);
  return clean ? md.render(clean) : "";
}
