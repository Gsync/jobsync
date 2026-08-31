import path from "node:path";

// Symptom when one is missing: the published page title reads "Ai" not "AI".
export const WIKI_ACRONYMS: Record<string, string> = {
  ai: "AI",
  mcp: "MCP",
  pdf: "PDF",
  csv: "CSV",
  ats: "ATS",
};

function capitalise(word: string): string {
  const acronym = WIKI_ACRONYMS[word.toLowerCase()];
  if (acronym) return acronym;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// GitHub renders a "-" in a wiki filename as a space, so Getting-Started.md
// publishes as the page "Getting Started".
export function toWikiPageName(relPath: string): string {
  const normalised = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  const withoutExt = normalised.replace(/\.md$/i, "");
  const segments = withoutExt.split("/").filter(Boolean);

  // A directory's index is that directory's page, not "<Dir>-Index".
  if (segments[segments.length - 1] === "index") {
    segments.pop();
    if (segments.length === 0) return "Home";
  }

  return segments
    .flatMap((segment) => segment.split("-"))
    .filter(Boolean)
    .map(capitalise)
    .join("-");
}

export function toWikiFileName(relPath: string): string {
  return `${toWikiPageName(relPath)}.md`;
}

const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;

// Publisher-side rewriting only. The deferred help tool needs the opposite
// transform (link -> label text), because renderAgentMarkdown disables links.
//
// Deliberately fence-blind, unlike extractHeadings: a link inside a fenced
// example is rewritten too. Cosmetic, and only on the published copy.
export function rewriteWikiLinks(body: string, fromDir = ""): string {
  return body.replace(MARKDOWN_LINK, (match, target: string) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) return match;
    const [pathPart, fragment] = target.split("#");
    if (!/\.md$/i.test(pathPart)) return match;
    const resolved = path.posix.normalize(path.posix.join(fromDir, pathPart));
    return `](${toWikiPageName(resolved)}${fragment ? `#${fragment}` : ""})`;
  });
}

const SIDEBAR_ITEM = /^\s*[-*]\s+\[([^\]]+)\]\(([^)\s]+)\)/;

export function buildSidebar(rewrittenIndexBody: string): string {
  const items = rewrittenIndexBody
    .split("\n")
    .map((line) => SIDEBAR_ITEM.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => `- [${match[1]}](${match[2]})`);

  return `### JobSync Help\n\n- [Home](Home)\n${items.join("\n")}\n`;
}
