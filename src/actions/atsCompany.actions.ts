"use server";

import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { ATS_TOKEN_REGEX } from "@/lib/scraper/utils";
import greenhouseSeed from "@/lib/scraper/greenhouse/companies.json";
import leverSeed from "@/lib/scraper/lever/companies.json";
import type { JobBoard, LeverHost } from "@/models/automation.model";

// `host` is present (optional) on Lever entries only; Greenhouse entries omit it.
type SeedCompany = { name: string; token: string; host?: LeverHost };

const SEEDS: Record<string, SeedCompany[]> = {
  greenhouse: greenhouseSeed,
  lever: leverSeed as SeedCompany[],
};

type ResolveResult =
  | { success: true; name: string; token: string; host?: LeverHost }
  | { success: false; message: string };

// Page size for the company typeahead/browse (infinite scroll loads a page at
// a time so the popover never mounts the whole 1000+ seed at once).
const ATS_COMPANY_PAGE_SIZE = 50;

// Typeahead over the seeded companies.json (server-side filter, paginated).
// An empty query browses the full list (alphabetical); `offset` drives the
// infinite-scroll load-more. Returns a page plus whether more remain.
export async function searchAtsCompanies(
  provider: JobBoard,
  query: string,
  offset = 0,
): Promise<{ companies: SeedCompany[]; hasMore: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { companies: [], hasMore: false };

  const seed = SEEDS[provider] ?? [];
  const q = query.trim().toLowerCase();
  const matches =
    q.length < 1
      ? seed
      : seed.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.token.toLowerCase().includes(q),
        );

  const companies = matches.slice(offset, offset + ATS_COMPANY_PAGE_SIZE);
  return { companies, hasMore: offset + companies.length < matches.length };
}

// Total number of companies in the seeded directory (for a browse hint).
export async function getAtsCompanyCount(provider: JobBoard): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return (SEEDS[provider] ?? []).length;
}

// Validate a token or board URL; returns the display company name (and, for
// Lever, the resolved host). Dispatches per provider.
export async function resolveAtsBoard(
  provider: JobBoard,
  input: string,
): Promise<ResolveResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Not authenticated" };

  if (provider === "greenhouse") return resolveGreenhouse(input);
  if (provider === "lever") return resolveLever(input);
  return { success: false, message: "Unsupported provider" };
}

// Greenhouse: extract token from a board URL or bare token; validate via
// /boards/{token}; return the API's official name.
function extractGreenhouseToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i,
  );
  if (urlMatch) return urlMatch[1].toLowerCase();

  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    const token = trimmed.toLowerCase();
    return ATS_TOKEN_REGEX.test(token) ? token : null;
  }

  return null;
}

async function resolveGreenhouse(input: string): Promise<ResolveResult> {
  const token = extractGreenhouseToken(input);
  if (!token) {
    return {
      success: false,
      message: "Paste a boards.greenhouse.io link or a board token",
    };
  }

  try {
    const response = await fetch(
      `${APP_CONSTANTS.GREENHOUSE_BASE_URL}/${encodeURIComponent(token)}`,
    );

    if (response.status === 404) {
      return {
        success: false,
        message: `No Greenhouse board found for '${token}'`,
      };
    }
    if (!response.ok) {
      return {
        success: false,
        message: `Could not validate board (${response.status})`,
      };
    }

    const data: { name?: string } = await response.json();
    const name = data.name?.trim();
    if (!name) {
      return { success: false, message: "Board has no company name" };
    }

    return { success: true, name, token };
  } catch {
    return { success: false, message: "Could not reach Greenhouse" };
  }
}

// Lever: extract token (+ explicit EU host) from a jobs.lever.co /
// jobs.eu.lever.co URL or bare token; validate by probing the postings
// endpoint; resolve the display name from the seed or a humanized token.
function extractLeverToken(
  input: string,
): { token: string; host?: LeverHost } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/jobs\.(eu\.)?lever\.co\/([a-z0-9_-]+)/i);
  if (urlMatch) {
    return {
      token: urlMatch[2].toLowerCase(),
      host: urlMatch[1] ? "eu" : "default",
    };
  }

  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    return { token: trimmed.toLowerCase() };
  }

  return null;
}

function humanizeToken(token: string): string {
  return token
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function probeLeverBoard(
  token: string,
  host: LeverHost,
): Promise<boolean> {
  const base =
    host === "eu"
      ? APP_CONSTANTS.LEVER_EU_BASE_URL
      : APP_CONSTANTS.LEVER_BASE_URL;
  const res = await fetch(
    `${base}/${encodeURIComponent(token)}?mode=json&limit=1`,
  );
  return res.ok;
}

async function resolveLever(input: string): Promise<ResolveResult> {
  const extracted = extractLeverToken(input);
  if (!extracted) {
    return {
      success: false,
      message: "Paste a jobs.lever.co link or a token",
    };
  }

  const { token } = extracted;
  // Defense-in-depth: reject a malformed token before any fetch.
  if (!ATS_TOKEN_REGEX.test(token)) {
    return { success: false, message: `Invalid Lever token '${token}'` };
  }

  try {
    let host: LeverHost;
    if (extracted.host === "eu") {
      if (!(await probeLeverBoard(token, "eu"))) {
        return { success: false, message: `No Lever board found for '${token}'` };
      }
      host = "eu";
    } else {
      // Bare token or default-host URL: probe default first, fall back to EU.
      if (await probeLeverBoard(token, "default")) {
        host = "default";
      } else if (await probeLeverBoard(token, "eu")) {
        host = "eu";
      } else {
        return { success: false, message: `No Lever board found for '${token}'` };
      }
    }

    const seeded = (leverSeed as SeedCompany[]).find((c) => c.token === token);
    const name = seeded?.name ?? humanizeToken(token);
    return { success: true, name, token, host };
  } catch {
    return { success: false, message: "Could not reach Lever" };
  }
}
