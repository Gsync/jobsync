import { decodeHtml, flattenHtml } from "../html";
import {
  formatSalary,
  inferWorkplaceType,
  normalizeWorkplaceLabel,
  type WorkplaceLabel,
} from "./normalize";

export interface ExtractedJobFields {
  title?: string;
  company?: string;
  location?: string;
  descriptionHtml?: string;
  descriptionText?: string;
  employmentType?: string;
  workplaceType?: WorkplaceLabel;
  salary?: string;
  postedDate?: string;
  siteName?: string;
  canonicalUrl?: string;
}

const META_TAG = /<meta\b[^>]*>/gi;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;
const JSON_LD =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const tag of html.match(META_TAG) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(ATTRIBUTE)) {
      attrs[match[1].toLowerCase()] = stripQuotes(match[2]);
    }
    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content;
    if (key && content && !tags.has(key)) {
      tags.set(key, decodeHtml(content).trim());
    }
  }
  return tags;
}

/**
 * Escapes literal newlines and tabs inside JSON strings. Some sites embed a
 * description with real line breaks, which JSON forbids but browsers tolerate.
 */
function escapeControlCharsInStrings(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const character of raw) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      result += character;
      continue;
    }
    if (inString) {
      if (character === "\n") {
        result += "\\n";
        continue;
      }
      if (character === "\r") {
        result += "\\r";
        continue;
      }
      if (character === "\t") {
        result += "\\t";
        continue;
      }
    }
    result += character;
  }
  return result;
}

function parseJsonBlock(raw: string): { ok: boolean; value?: unknown } {
  for (const candidate of [raw, decodeHtml(raw)]) {
    try {
      return {
        ok: true,
        value: JSON.parse(escapeControlCharsInStrings(candidate)),
      };
    } catch {
      // Try the entity-decoded form, then give up on this block.
    }
  }
  return { ok: false };
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(JSON_LD)) {
    const raw = match[1]
      .trim()
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "");
    const parsed = parseJsonBlock(raw);
    if (parsed.ok) blocks.push(parsed.value);
  }
  return blocks;
}

function isJobPosting(value: Record<string, unknown>): boolean {
  const type = value["@type"];
  if (typeof type === "string") return type.toLowerCase() === "jobposting";
  if (Array.isArray(type)) {
    return type.some((entry) => String(entry).toLowerCase() === "jobposting");
  }
  return false;
}

function findJobPosting(
  value: unknown,
  depth = 0,
): Record<string, unknown> | null {
  if (!value || depth > 6) return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findJobPosting(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (isJobPosting(record)) return record;

  if (record["@graph"]) {
    const found = findJobPosting(record["@graph"], depth + 1);
    if (found) return found;
  }

  for (const child of Object.values(record)) {
    if (child && typeof child === "object") {
      const found = findJobPosting(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function asText(value: unknown): string {
  if (typeof value === "string") return decodeHtml(value).trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map(asText).filter(Boolean)),
    ).join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.name !== undefined) return asText(record.name);
    if (record["@value"] !== undefined) return asText(record["@value"]);
  }
  return "";
}

function locationText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return decodeHtml(value).trim();
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map(locationText).filter(Boolean)),
    ).join(", ");
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (record.address) return locationText(record.address);
  if (record.name !== undefined) return asText(record.name);

  const parts = [
    record.addressLocality,
    record.addressRegion,
    record.addressCountry,
  ]
    .map(asText)
    .filter(Boolean);
  return Array.from(new Set(parts)).join(", ");
}

// A posting can list every country it hires in, which is unusable as a form
// value. Keep short lists; longer ones fall back to the remote/work-mode text.
function requirementLocationText(value: unknown): string {
  const text = locationText(value);
  if (!text) return "";
  return text.split(", ").length > 4 ? "" : text;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTitle(title: string, siteName?: string): string {
  const trimmed = title.trim();
  if (!trimmed || !siteName) return trimmed;
  const suffix = new RegExp(
    `\\s*[|\\-–—·]\\s*${escapeRegExp(siteName)}\\s*$`,
    "i",
  );
  return trimmed.replace(suffix, "").trim() || trimmed;
}

// Job boards often decorate the posted title with a status prefix and the
// employer suffix ("[Hiring] Engineer @Acme"). Strip those when the employer
// is already known so the stored title is just the role.
function cleanImportedTitle(title: string, company?: string): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;

  let cleaned = trimmed.replace(
    /^\s*\[(hiring|new|urgent|remote|hybrid|on-?site|full-?time|part-?time|contract)\]\s*/i,
    "",
  );

  if (company) {
    const suffix = new RegExp(
      `\\s*[@|–—-]\\s*${escapeRegExp(company)}\\s*$`,
      "i",
    );
    cleaned = cleaned.replace(suffix, "");
  }

  return cleaned.trim() || trimmed;
}

function firstH1(html: string): string {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? flattenHtml(match[1]) : "";
}

function canonicalLink(html: string): string | undefined {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/\brel\s*=\s*["']?canonical/i.test(tag)) continue;
    const href = /\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i.exec(tag)?.[1];
    if (href) return decodeHtml(stripQuotes(href)).trim();
  }
  return undefined;
}

/**
 * Extracts a posting from a page's schema.org JobPosting JSON-LD, falling back
 * to OpenGraph/meta tags and finally the page title/H1. Works for most ATS and
 * company career pages without a provider-specific API.
 */
export function extractJobFromHtml(
  html: string,
  pageUrl: string,
): ExtractedJobFields {
  const posting = jsonLdBlocks(html)
    .map((block) => findJobPosting(block))
    .find((entry): entry is Record<string, unknown> => !!entry);

  const meta = metaTags(html);
  const siteName = meta.get("og:site_name") || meta.get("application-name");

  const descriptionHtml =
    typeof posting?.description === "string"
      ? posting.description
      : meta.get("og:description") || meta.get("description") || "";

  const location =
    locationText(posting?.jobLocation) ||
    requirementLocationText(posting?.applicantLocationRequirements) ||
    "";

  const company =
    asText(posting?.hiringOrganization) ||
    meta.get("og:site_name") ||
    meta.get("application-name") ||
    "";

  const rawTitle =
    asText(posting?.title) ||
    meta.get("og:title") ||
    meta.get("twitter:title") ||
    cleanTitle(
      decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""),
      siteName,
    ) ||
    firstH1(html);

  const title = cleanImportedTitle(rawTitle, company);

  const employmentType = asText(posting?.employmentType);
  const salary = formatSalary(posting?.baseSalary ?? posting?.estimatedSalary);

  const remoteSignal = [
    asText(posting?.jobLocationType),
    asText(posting?.applicantLocationRequirements),
    location,
  ].join(" ");

  const workplaceType =
    normalizeWorkplaceLabel(remoteSignal) ??
    inferWorkplaceType(location, title, flattenHtml(descriptionHtml));

  const postedDate = asText(posting?.datePosted) || undefined;
  const canonicalUrl =
    (typeof posting?.url === "string" ? posting.url : undefined) ||
    canonicalLink(html) ||
    meta.get("og:url") ||
    pageUrl;

  return {
    title: title.trim() || undefined,
    company: company.trim() || undefined,
    location: location.trim() || undefined,
    descriptionHtml: descriptionHtml.trim() || undefined,
    descriptionText: flattenHtml(descriptionHtml) || undefined,
    employmentType: employmentType || undefined,
    workplaceType,
    salary,
    postedDate,
    siteName: siteName?.trim() || undefined,
    canonicalUrl: canonicalUrl.trim() || undefined,
  };
}
