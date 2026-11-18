import { APP_CONSTANTS } from "@/lib/constants";
import type { ScraperResult } from "../types";
import { parseImportUrl } from "./detect";

const HEADERS = {
  "User-Agent": APP_CONSTANTS.LINKEDIN_USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
};

const MAX_REDIRECTS = 4;

function ipv4ToNumber(host: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return null;
  return (
    ((parts[0] << 24) >>> 0) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  );
}

const BLOCKED_IPV4_RANGES: [number, number][] = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x64400000, 0x647fffff], // 100.64.0.0/10 (CGNAT)
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (link-local/metadata)
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15
  [0xe0000000, 0xefffffff], // 224.0.0.0/4 (multicast)
  [0xf0000000, 0xffffffff], // 240.0.0.0/4 (reserved)
];

function isBlockedIpv4(host: string): boolean {
  const value = ipv4ToNumber(host);
  if (value === null) return false;
  return BLOCKED_IPV4_RANGES.some(
    ([start, end]) => value >= start && value <= end,
  );
}

function isBlockedIpv6(host: string): boolean {
  const value = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;

  // IPv4-mapped addresses, e.g. ::ffff:127.0.0.1
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/**
 * Rejects URLs that would make the server fetch its own network. This is a
 * static check (no DNS lookup), which covers literal loopback/private hosts
 * and cloud metadata endpoints — the cases an import URL could plausibly hit.
 */
export function isSafeImportUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return false;
  }
  if (host.includes(":")) return !isBlockedIpv6(host);
  return !isBlockedIpv4(host);
}

interface FetchTextResult {
  url: string;
  status: number;
  text: string;
}

function networkMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "The posting took too long to respond.";
  }
  return error instanceof Error
    ? error.message
    : "Could not reach the posting.";
}

function statusError(status: number): ScraperResult<never> {
  if (status === 401 || status === 403) {
    return {
      success: false,
      error: {
        type: "blocked",
        reason: "This site blocked the request. Try the posting in a browser.",
      },
    };
  }
  if (status === 429) {
    return { success: false, error: { type: "rate_limited" } };
  }
  if (status === 404 || status === 410) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "This posting is no longer available.",
      },
    };
  }
  return {
    success: false,
    error: { type: "network", message: `The site returned ${status}.` },
  };
}

/** Fetches a page as text, following redirects only to safe public hosts. */
export async function fetchImportPage(
  input: string | URL,
  timeoutMs: number = APP_CONSTANTS.LINKEDIN_FETCH_TIMEOUT_MS,
): Promise<ScraperResult<FetchTextResult>> {
  let url: URL | null =
    typeof input === "string" ? parseImportUrl(input) : input;
  if (!url) {
    return {
      success: false,
      error: { type: "parse", message: "Enter a valid job posting URL." },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isSafeImportUrl(url)) {
        return {
          success: false,
          error: {
            type: "parse",
            message: "That URL points to a private address and cannot be imported.",
          },
        };
      }

      const response: Response = await fetch(url.toString(), {
        headers: HEADERS,
        signal: controller.signal,
        cache: "no-store",
        redirect: "manual",
      });

      if (response.status >= 300 && response.status < 400) {
        const location: string | null = response.headers?.get?.("location") ?? null;
        if (!location) return statusError(response.status);
        url = new URL(location, url);
        continue;
      }

      if (!response.ok) return statusError(response.status);
      return { success: true, data: { url: url.toString(), status: response.status, text: await response.text() } };
    }

    return {
      success: false,
      error: { type: "network", message: "Too many redirects." },
    };
  } catch (error) {
    return {
      success: false,
      error: { type: "network", message: networkMessage(error) },
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches a JSON API endpoint. Non-2xx responses become scraper errors. */
export async function fetchImportJson<T>(
  input: string,
  timeoutMs: number = APP_CONSTANTS.LINKEDIN_FETCH_TIMEOUT_MS,
): Promise<ScraperResult<T>> {
  const page = await fetchImportPage(input, timeoutMs);
  if (!page.success) return page;
  try {
    return { success: true, data: JSON.parse(page.data.text) as T };
  } catch {
    return {
      success: false,
      error: {
        type: "parse",
        message: "The job board returned a response JobSync could not read.",
      },
    };
  }
}
