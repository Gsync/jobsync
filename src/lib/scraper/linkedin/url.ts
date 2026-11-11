import { APP_CONSTANTS } from "@/lib/constants";

// Only these query params are forwarded to LinkedIn's public guest search
// endpoint. Keeping an allowlist avoids passing arbitrary user input through
// to the upstream service and makes the saved URL stable across sessions.
const SEARCH_PARAMS = [
  "keywords",
  "location",
  "geoId",
  "distance",
  "f_TPR",
  "f_WT",
  "f_E",
  "f_JT",
  "f_PP",
  "f_C",
  "f_AL",
  "sortBy",
] as const;

export interface ParsedLinkedInSearch {
  /** Canonical URL stored in JobSync. */
  url: string;
  keywords: string;
  location: string;
  /** Query string for the guest search endpoint, without `start`. */
  guestQuery: URLSearchParams;
}

export function isLinkedInHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!isLinkedInHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Extracts the numeric posting id from any LinkedIn job URL:
 *   /jobs/view/4472781721
 *   /jobs/view/senior-engineer-at-acme-4472781721
 *   /jobs/search/?currentJobId=4472781721
 */
export function parseLinkedInJobId(input: string): string | null {
  const url = parseUrl(input);
  if (!url) return null;

  const fromQuery = url.searchParams.get("currentJobId");
  if (fromQuery && /^\d{6,}$/.test(fromQuery)) return fromQuery;

  const match = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d{6,})\/?$/);
  return match?.[1] ?? null;
}

export function isLinkedInJobUrl(input: string): boolean {
  return parseLinkedInJobId(input) !== null;
}

export function canonicalLinkedInJobUrl(id: string): string {
  return `${APP_CONSTANTS.LINKEDIN_BASE_URL}/jobs/view/${id}`;
}

/**
 * Parses a LinkedIn jobs search URL into a stable saved search. Returns null
 * for non-LinkedIn URLs and for URLs that carry no search criteria at all.
 */
export function parseLinkedInSearchUrl(
  input: string,
): ParsedLinkedInSearch | null {
  const url = parseUrl(input);
  if (!url) return null;
  if (!url.pathname.startsWith("/jobs/search")) return null;

  const guestQuery = new URLSearchParams();
  for (const key of SEARCH_PARAMS) {
    const value = url.searchParams.get(key);
    if (value !== null && value.trim() !== "") {
      guestQuery.set(key, value.trim());
    }
  }

  const keywords = guestQuery.get("keywords") ?? "";
  const location = guestQuery.get("location") ?? "";
  if (!keywords && !location && !guestQuery.get("geoId")) return null;

  // Sort for a deterministic dedupe key; URLSearchParams preserves insertion
  // order otherwise, so the same search could otherwise be saved twice.
  const sorted = new URLSearchParams(
    [...guestQuery.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const canonical = new URL("/jobs/search/", APP_CONSTANTS.LINKEDIN_BASE_URL);
  canonical.search = sorted.toString();

  return {
    url: canonical.toString(),
    keywords,
    location,
    guestQuery: sorted,
  };
}

export function isLinkedInSearchUrl(input: string): boolean {
  return parseLinkedInSearchUrl(input) !== null;
}

export function buildLinkedInGuestSearchUrl(
  search: ParsedLinkedInSearch,
  start = 0,
): string {
  const params = new URLSearchParams(search.guestQuery);
  params.set("start", String(Math.max(0, start)));
  return `${APP_CONSTANTS.LINKEDIN_BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
}
