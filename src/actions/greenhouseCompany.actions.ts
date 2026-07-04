"use server";

import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import companies from "@/lib/scraper/greenhouse/companies.json";
import type { GreenhouseCompany } from "@/models/automation.model";

const TOKEN_REGEX = /^[a-z0-9][a-z0-9_-]{1,79}$/;

// Extract a board token from a Greenhouse board URL or accept a bare token.
function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i,
  );
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    const token = trimmed.toLowerCase();
    return TOKEN_REGEX.test(token) ? token : null;
  }

  return null;
}

// Validate a token or board URL; returns the official company name.
export async function resolveGreenhouseBoard(
  input: string,
): Promise<
  | { success: true; name: string; token: string }
  | { success: false; message: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const token = extractToken(input);
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
      return { success: false, message: `No Greenhouse board found for '${token}'` };
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

// Total number of companies in the seeded directory (for a browse hint).
export async function getGreenhouseCompanyCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return companies.length;
}

// Typeahead over the seeded companies.json (server-side filter, capped).
// An empty query returns the full list (alphabetical) as a browsable default.
export async function searchGreenhouseCompanies(
  query: string,
): Promise<GreenhouseCompany[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const q = query.trim().toLowerCase();
  if (q.length < 1) return companies;

  return companies
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.token.toLowerCase().includes(q),
    )
    .slice(0, 20);
}
