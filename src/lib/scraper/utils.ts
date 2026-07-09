import type { ScraperError } from "./types";

// Allowlist for ATS board tokens (shared by Greenhouse + Lever). Rejects
// path/query injection before the token is interpolated into a fetch URL.
export const ATS_TOKEN_REGEX = /^[a-z0-9][a-z0-9_-]{1,79}$/;

// Human-readable reason for a per-board fetch failure. Shared by both ATS
// providers so the runner logs a consistent label.
export function errorReason(error: ScraperError): string {
  switch (error.type) {
    case "blocked":
      return error.reason;
    case "rate_limited":
      return "rate limited";
    case "network":
    case "parse":
      return error.message;
  }
}

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "source",
  "fbclid",
  "gclid",
  "msclkid",
  "tk",
  "from",
  "vjk",
  "gh_src",
];

// Normalizes a URL for storage/clicking: only touches things that never change
// which resource the URL points to (tracking params, fragment, param order,
// trailing slash). Deliberately keeps host/protocol/www intact so the stored
// link stays valid.
export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    TRACKING_PARAMS.forEach((param) => {
      parsed.searchParams.delete(param);
    });
    parsed.searchParams.sort();
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

// Aggressive canonical form used only as a dedup comparison key (never stored
// or clicked), so it can safely fold host case and a leading "www.".
function urlDedupeKey(url: string): string {
  try {
    const parsed = new URL(normalizeJobUrl(url));
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return `${host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

interface DedupableJob {
  url?: string | null;
  title?: string;
  company?: string;
  location?: string;
}

// One key per job, shared by both the incoming batch and existing DB records so
// they compare identically. Falls back to a title/company/location signature
// when a job has no usable URL (otherwise linkless jobs re-add every run).
export function jobDedupeKey(job: DedupableJob): string {
  const url = job.url?.trim();
  if (url) return `url:${urlDedupeKey(url)}`;
  const meta = [job.title, job.company, job.location]
    .map((part) => normalizeForSearch(part ?? ""))
    .join("|");
  return `meta:${meta}`;
}

// Removes jobs already saved (existingKeys) and collapses duplicates within the
// batch itself. Both source paths (JSearch, Greenhouse) run through here.
export function dedupeJobs<T extends DedupableJob>(
  jobs: T[],
  existingKeys: Set<string>,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const job of jobs) {
    const key = jobDedupeKey(job);
    if (existingKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }
  return result;
}

export function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const STOP_WORDS = [
  "senior",
  "jr",
  "junior",
  "sr",
  "inc",
  "llc",
  "ltd",
  "corp",
  "corporation",
  "the",
  "a",
  "an",
  "co",
  "company",
];

export function extractKeywords(str: string): string[] {
  return str
    .toLowerCase()
    .split(/[\s\-_,\.]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.includes(word));
}

export function extractCityName(location: string): string | null {
  const parts = location.split(",");
  if (parts.length > 0) {
    return parts[0].trim().toLowerCase();
  }
  return null;
}
