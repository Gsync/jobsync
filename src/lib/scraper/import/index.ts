import type { ScraperResult } from "../types";
import { fetchLinkedInJob } from "../linkedin";
import type { LinkedInJobDetails } from "../linkedin/types";
import { sanitizeJobHtml, textToHtml } from "../html";
import { detectJobUrl, parseImportUrl, sourceLabelForUrl } from "./detect";
import { fetchImportPage } from "./http";
import { extractJobFromHtml } from "./jsonld";
import { inferWorkplaceType, type WorkplaceLabel } from "./normalize";
import {
  fetchAshbyJob,
  fetchGreenhouseJob,
  fetchLeverJob,
  fetchRipplingJob,
} from "./providers";
import type { ImportedJobDetails } from "./types";

export type {
  DetectedJobUrl,
  ImportedJobDetails,
  JobImportProvider,
} from "./types";
export { detectJobUrl, parseImportUrl } from "./detect";

const MULTI_PART_TLDS = new Set([
  "co.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "com.br",
  "co.in",
  "com.mx",
]);

function brandFromHost(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = host.split(".");
  if (parts.length <= 1) return host;

  const tld = parts.slice(-2).join(".");
  const index = MULTI_PART_TLDS.has(tld) ? parts.length - 3 : parts.length - 2;
  const brand = parts[Math.max(0, index)] ?? host;
  return brand
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function absoluteUrl(value: string | undefined, base: string): string {
  if (!value) return base;
  try {
    return new URL(value, base).toString();
  } catch {
    return base;
  }
}

function linkedInDetails(details: LinkedInJobDetails): ImportedJobDetails {
  return {
    provider: "linkedin",
    sourceLabel: "LinkedIn",
    url: details.url,
    title: details.title,
    company: details.company,
    location: details.location,
    descriptionHtml: details.descriptionHtml,
    descriptionText: details.descriptionText,
    employmentType: details.employmentType,
    workplaceType: details.workplaceType,
    salary: details.salary,
    postedDate: details.postedDate,
  };
}

async function genericDetails(
  inputUrl: string,
): Promise<ScraperResult<ImportedJobDetails>> {
  const page = await fetchImportPage(inputUrl);
  if (!page.success) return page;

  const url = parseImportUrl(page.data.url) ?? parseImportUrl(inputUrl)!;
  const extracted = extractJobFromHtml(page.data.text, page.data.url);
  const title = extracted.title?.trim();
  if (!title) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "Could not find a job posting on that page.",
      },
    };
  }

  const descriptionHtml = extracted.descriptionHtml
    ? sanitizeJobHtml(extracted.descriptionHtml)
    : textToHtml(extracted.descriptionText ?? "");

  const workplaceType: WorkplaceLabel | undefined =
    extracted.workplaceType ??
    inferWorkplaceType(
      extracted.location ?? "",
      title,
      extracted.descriptionText ?? "",
    );

  return {
    success: true,
    data: {
      provider: "generic",
      sourceLabel: sourceLabelForUrl(url, extracted.siteName),
      url: absoluteUrl(extracted.canonicalUrl, page.data.url),
      title,
      company:
        extracted.company?.trim() ||
        extracted.siteName?.trim() ||
        brandFromHost(url),
      location: extracted.location?.trim() ?? "",
      descriptionHtml,
      descriptionText: extracted.descriptionText ?? "",
      employmentType: extracted.employmentType,
      workplaceType,
      salary: extracted.salary,
      postedDate: extracted.postedDate,
    },
  };
}

/**
 * Resolves any job posting URL into the fields the Add Job form can fill.
 * LinkedIn and the supported ATSs use their structured endpoints; everything
 * else falls back to schema.org JSON-LD/OpenGraph on the posting page.
 */
export async function resolveJobFromUrl(
  input: string,
): Promise<ScraperResult<ImportedJobDetails>> {
  const detected = detectJobUrl(input);
  if (!detected) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "Enter a valid job posting URL.",
      },
    };
  }

  const url = parseImportUrl(input)!;

  switch (detected.provider) {
    case "linkedin": {
      const result = await fetchLinkedInJob(input);
      return result.success
        ? { success: true, data: linkedInDetails(result.data) }
        : result;
    }
    case "greenhouse": {
      const result = await fetchGreenhouseJob(
        detected.token!,
        detected.id!,
        url.toString(),
      );
      return result.success ? result : genericDetails(url.toString());
    }
    case "lever": {
      const result = await fetchLeverJob(
        detected.token!,
        detected.id!,
        url.toString(),
        detected.eu,
      );
      return result.success ? result : genericDetails(url.toString());
    }
    case "ashby": {
      const result = await fetchAshbyJob(
        detected.token!,
        detected.id!,
        url.toString(),
      );
      return result.success ? result : genericDetails(url.toString());
    }
    case "rippling": {
      const result = await fetchRipplingJob(
        detected.token!,
        detected.id!,
        url.toString(),
      );
      return result.success ? result : genericDetails(url.toString());
    }
    case "generic":
      return genericDetails(url.toString());
  }
}
