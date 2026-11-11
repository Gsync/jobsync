import { decodeHtml } from "../html";
import type { LinkedInJobDetails, LinkedInSearchResult } from "./types";
import { canonicalLinkedInJobUrl } from "./url";

function matchFirst(html: string, pattern: RegExp): string {
  return pattern.exec(html)?.[1] ?? "";
}

/** Converts a LinkedIn HTML fragment to readable text, preserving blocks. */
export function textFromHtml(html: string): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "");
  return decodeHtml(withBreaks)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function oneLine(html: string): string {
  return textFromHtml(html).replace(/\s+/g, " ").trim();
}

/**
 * Returns the inner HTML of the first <div class="...className...">,
 * balancing nested divs so a description that contains a div is not cut off
 * at the first closing tag.
 */
function extractBalancedDiv(html: string, className: string): string {
  const opening = new RegExp(
    `<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`,
    "i",
  );
  const match = opening.exec(html);
  if (!match) return "";

  const start = match.index + match[0].length;
  let depth = 1;
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = start;

  for (let tag = tagPattern.exec(html); tag; tag = tagPattern.exec(html)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.index);
  }

  return html.slice(start);
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "a",
  "span",
  "div",
  "hr",
]);

/**
 * Conservatively strips active content from LinkedIn's description HTML before
 * it reaches the Tiptap editor. Tiptap already ignores unknown tags on parse,
 * but the stored value is also read by PDFs and AI prompts, so remove scripts,
 * event handlers and javascript: URLs here rather than relying on one renderer.
 */
export function sanitizeLinkedInHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[^>]*\/?>/gi,
      "",
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
      ' $1="#"',
    )
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) =>
      ALLOWED_TAGS.has(name.toLowerCase()) ? tag : "",
    )
    .trim();
}

function inferWorkplaceType(
  location: string,
  title: string,
  description: string,
): LinkedInJobDetails["workplaceType"] {
  const sources = [
    location.toLowerCase(),
    title.toLowerCase(),
    description.slice(0, 600).toLowerCase(),
  ];
  for (const source of sources) {
    if (/\bhybrid\b/.test(source)) return "Hybrid";
    if (/\bremote\b/.test(source)) return "Remote";
    if (/\bon[- ]?site\b/.test(source)) return "Onsite";
  }
  return undefined;
}

function inferSalary(description: string): string | undefined {
  if (!/\b(salary|compensation|pay range|base pay)\b/i.test(description)) {
    return undefined;
  }
  const match = description.match(
    /\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$?[\d,]+(?:\.\d+)?)?/,
  );
  return match?.[0];
}

export function parseLinkedInJobHtml(
  html: string,
  id: string,
): LinkedInJobDetails | null {
  const title = oneLine(
    matchFirst(
      html,
      /<h[12][^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i,
    ) ||
      matchFirst(
        html,
        /<h[12][^>]*class="[^"]*topcard__title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i,
      ),
  );
  const company = oneLine(
    matchFirst(
      html,
      /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    ),
  );
  if (!title || !company) return null;

  const location = oneLine(
    matchFirst(
      html,
      /<span[^>]*class="[^"]*topcard__flavor[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    ),
  );

  const descriptionHtml = sanitizeLinkedInHtml(
    extractBalancedDiv(html, "show-more-less-html__markup") ||
      extractBalancedDiv(html, "description__text"),
  );
  const descriptionText = textFromHtml(descriptionHtml);

  const employmentType = oneLine(
    matchFirst(
      html,
      /Employment type[\s\S]{0,500}?<span[^>]*description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/i,
    ),
  );

  const postedDate =
    oneLine(
      matchFirst(
        html,
        /<span[^>]*class="[^"]*posted-time-ago__text[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      ),
    ) ||
    oneLine(
      matchFirst(
        html,
        /<time[^>]*class="[^"]*posted-time-ago[^"]*"[^>]*>([\s\S]*?)<\/time>/i,
      ),
    ) ||
    undefined;

  return {
    id,
    url: canonicalLinkedInJobUrl(id),
    title,
    company,
    location,
    descriptionHtml,
    descriptionText,
    employmentType: employmentType || undefined,
    workplaceType: inferWorkplaceType(location, title, descriptionText),
    postedDate,
    salary: inferSalary(descriptionText),
  };
}

export function parseLinkedInSearchResults(
  html: string,
): LinkedInSearchResult[] {
  const results: LinkedInSearchResult[] = [];
  const seen = new Set<string>();
  const cardPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;

  for (let card = cardPattern.exec(html); card; card = cardPattern.exec(html)) {
    const block = card[1];
    const id = matchFirst(
      block,
      /data-entity-urn="urn:li:jobPosting:(\d+)"/i,
    );
    const title = oneLine(
      matchFirst(
        block,
        /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
      ),
    );
    if (!id || !title || seen.has(id)) continue;

    const company = oneLine(
      matchFirst(
        block,
        /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i,
      ),
    );
    const location = oneLine(
      matchFirst(
        block,
        /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      ),
    );
    const postedDate =
      matchFirst(block, /<time[^>]*datetime="([^"]+)"/i) ||
      oneLine(matchFirst(block, /<time[^>]*>([\s\S]*?)<\/time>/i)) ||
      undefined;

    seen.add(id);
    results.push({
      id,
      url: canonicalLinkedInJobUrl(id),
      title,
      company,
      location,
      postedDate,
    });
  }

  return results;
}
