import { APP_CONSTANTS } from "@/lib/constants";
import type { ScraperResult } from "../types";
import {
  extractTechnologies,
  parseLinkedInJobHtml,
  parseLinkedInSearchResults,
} from "./parse";
import type {
  LinkedInJobDetails,
  LinkedInSearchPage,
  LinkedInSearchResult,
} from "./types";
import {
  buildLinkedInGuestSearchUrl,
  parseLinkedInJobId,
  parseLinkedInSearchUrl,
} from "./url";

const HEADERS = {
  "User-Agent": APP_CONSTANTS.LINKEDIN_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface FetchedPage {
  status: number;
  ok: boolean;
  text: string;
}

async function fetchText(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    APP_CONSTANTS.LINKEDIN_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    return {
      status: response.status,
      ok: response.ok,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function networkError(error: unknown): ScraperResult<never> {
  const message =
    error instanceof Error && error.name === "AbortError"
      ? "LinkedIn took too long to respond."
      : error instanceof Error
        ? error.message
        : "Could not reach LinkedIn.";
  return { success: false, error: { type: "network", message } };
}

function statusError(status: number): ScraperResult<never> {
  if (status === 429) {
    return { success: false, error: { type: "rate_limited" } };
  }
  if (status === 999 || status === 403) {
    return {
      success: false,
      error: {
        type: "blocked",
        reason: "LinkedIn blocked the request. Try again in a few minutes.",
      },
    };
  }
  if (status === 404) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "This LinkedIn posting is no longer available.",
      },
    };
  }
  return {
    success: false,
    error: { type: "network", message: `LinkedIn returned ${status}.` },
  };
}

/**
 * Fetches a public LinkedIn posting and returns normalized details. Uses the
 * guest posting fragment first (small and stable) and falls back to the public
 * job page if LinkedIn changes that fragment.
 */
export async function fetchLinkedInJob(
  input: string,
): Promise<ScraperResult<LinkedInJobDetails>> {
  const id = parseLinkedInJobId(input);
  if (!id) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "Enter a LinkedIn job URL such as linkedin.com/jobs/view/1234567890.",
      },
    };
  }

  const sources = [
    `${APP_CONSTANTS.LINKEDIN_BASE_URL}/jobs-guest/jobs/api/jobPosting/${id}`,
    `${APP_CONSTANTS.LINKEDIN_BASE_URL}/jobs/view/${id}`,
  ];

  let firstError: ScraperResult<never> | null = null;

  for (const url of sources) {
    let page: FetchedPage;
    try {
      page = await fetchText(url);
    } catch (error) {
      firstError ??= networkError(error);
      continue;
    }

    if (!page.ok) {
      firstError ??= statusError(page.status);
      continue;
    }

    const parsed = parseLinkedInJobHtml(page.text, id);
    if (parsed) return { success: true, data: parsed };
    firstError ??= {
      success: false,
      error: {
        type: "parse",
        message: "LinkedIn returned a page JobSync could not read.",
      },
    };
  }

  return (
    firstError ?? {
      success: false,
      error: {
        type: "parse",
        message: "LinkedIn returned a page JobSync could not read.",
      },
    }
  );
}

/**
 * Best-effort enrichment for search cards. The search endpoint only returns
 * title/company/location, so fetch each posting to surface its work
 * arrangement and the languages/frameworks named in the description. Failures
 * leave the already-parsed card untouched.
 */
async function enrichSearchResults(
  results: LinkedInSearchResult[],
): Promise<LinkedInSearchResult[]> {
  if (results.length === 0) return results;

  const enriched = [...results];
  let cursor = 0;

  const worker = async () => {
    while (cursor < results.length) {
      const index = cursor++;
      const result = results[index];

      try {
        const page = await fetchText(
          `${APP_CONSTANTS.LINKEDIN_BASE_URL}/jobs-guest/jobs/api/jobPosting/${result.id}`,
        );
        if (!page.ok) continue;

        const details = parseLinkedInJobHtml(page.text, result.id);
        if (!details) continue;

        const technologies = extractTechnologies(details.descriptionText);
        enriched[index] = {
          ...result,
          workplaceType: details.workplaceType ?? result.workplaceType,
          ...(technologies.length > 0 ? { technologies } : {}),
        };
      } catch {
        // Enrichment is optional; keep the card from the search page.
      }
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          APP_CONSTANTS.LINKEDIN_DETAIL_CONCURRENCY,
          results.length,
        ),
      },
      () => worker(),
    ),
  );

  return enriched;
}

/**
 * Fetches one page of public LinkedIn search results. The input can be any
 * LinkedIn jobs search URL, including the URL a saved search opens.
 */
export async function fetchLinkedInSearchResults(
  input: string,
  start = 0,
): Promise<ScraperResult<LinkedInSearchPage>> {
  const search = parseLinkedInSearchUrl(input);
  if (!search) {
    return {
      success: false,
      error: {
        type: "parse",
        message:
          "Paste a LinkedIn jobs search URL (linkedin.com/jobs/search/?keywords=...).",
      },
    };
  }

  const offset = Math.max(
    0,
    Math.min(start, APP_CONSTANTS.LINKEDIN_MAX_SEARCH_RESULTS),
  );
  const url = buildLinkedInGuestSearchUrl(search, offset);

  let page: FetchedPage;
  try {
    page = await fetchText(url);
  } catch (error) {
    return networkError(error);
  }

  if (!page.ok) return statusError(page.status);

  if (/authwall|sign in to view|join linkedin to view/i.test(page.text)) {
    return {
      success: false,
      error: {
        type: "blocked",
        reason: "LinkedIn asked for a sign-in. Try again in a few minutes.",
      },
    };
  }

  const results = await enrichSearchResults(
    parseLinkedInSearchResults(page.text),
  );
  const pageSize = APP_CONSTANTS.LINKEDIN_SEARCH_PAGE_SIZE;
  const nextStart =
    results.length >= pageSize &&
    offset + pageSize < APP_CONSTANTS.LINKEDIN_MAX_SEARCH_RESULTS
      ? offset + pageSize
      : null;

  return { success: true, data: { results, nextStart } };
}
