import type { ScraperError } from "./types";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";

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
// Uses the same canonicalization as entity resolution (resolve.ts) — in
// particular the company legal-suffix stripping — so two postings that
// resolve to the same Company/JobTitle/Location record also dedupe as the
// same job.
export function jobDedupeKey(job: DedupableJob): string {
  const url = job.url?.trim();
  if (url) return `url:${urlDedupeKey(url)}`;
  const meta = [
    canonicalizeEntityValue(job.title ?? ""),
    canonicalizeEntityValue(job.company ?? "", { stripLegalSuffix: true }),
    canonicalizeEntityValue(job.location ?? ""),
  ].join("|");
  return `meta:${meta}`;
}

// Removes jobs already saved (existingKeys) and collapses duplicates within the
// batch itself. Both source paths (JSearch, Greenhouse) run through here.
// Accepts any key lookup with `.has` so callers can pass a Set or the
// getExistingJobDedupeMap Map directly.
export function dedupeJobs<T extends DedupableJob>(
  jobs: T[],
  existingKeys: { has(key: string): boolean },
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
