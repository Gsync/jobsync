// Read by scripts/sync-wiki.mts at build time and by __tests__/wiki.spec.ts.
// Nothing under src/app imports it yet — the help tool that will is deferred.
// A future dead-code sweep should not delete this directory.
//
// Imports nothing on purpose: the sync script runs this file directly under
// Node's TypeScript type stripping, where a relative import would need a .ts
// extension that `tsc --noEmit` would then reject.

export type RawFrontmatter = Record<string, string | string[]>;

export interface ParsedWikiPage {
  frontmatter: RawFrontmatter;
  body: string;
  headings: string[];
}

const FENCE = "---";

function unquote(value: string): string {
  const first = value[0];
  const last = value[value.length - 1];
  if (value.length >= 2 && (first === '"' || first === "'") && first === last) {
    return value.slice(1, -1);
  }
  return value;
}

function parseValue(raw: string): string | string[] {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => unquote(item.trim()));
  }
  return unquote(value);
}

function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && line.startsWith("## ")) {
      headings.push(line.slice(3).trim());
    }
  }
  return headings;
}

export function parseWikiPage(raw: string): ParsedWikiPage {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== FENCE) {
    throw new Error('Page must start with a frontmatter block ("---")');
  }

  const frontmatter: RawFrontmatter = {};
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === FENCE) {
      close = i;
      break;
    }
    if (line.trim() === "") continue;
    const colon = line.indexOf(":");
    if (colon <= 0 || line !== line.trimStart()) {
      throw new Error(`Frontmatter line ${i + 1}: expected "key: value", got: ${line}`);
    }
    const key = line.slice(0, colon).trim();
    // Object.hasOwn, not `in`: "constructor" in {} is true, so `in` would
    // throw a bogus duplicate-key error for a page with a key of that name.
    if (Object.hasOwn(frontmatter, key)) {
      throw new Error(`Frontmatter duplicate key "${key}"`);
    }
    frontmatter[key] = parseValue(line.slice(colon + 1));
  }

  if (close === -1) {
    throw new Error('Unterminated frontmatter block: no closing "---"');
  }

  const body = lines.slice(close + 1).join("\n").replace(/^\n+/, "");
  return { frontmatter, body, headings: extractHeadings(body) };
}
