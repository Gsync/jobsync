import { APP_CONSTANTS } from "@/lib/constants";
import type { ScraperResult } from "../types";
import { decodeHtml, flattenHtml, sanitizeJobHtml } from "../html";
import type { LeverPosting } from "../lever/types";
import { fetchImportJson, fetchImportPage } from "./http";
import { extractJobFromHtml } from "./jsonld";
import {
  formatSalary,
  inferWorkplaceType,
  normalizeEmploymentType,
  normalizeWorkplaceLabel,
  salaryFromText,
} from "./normalize";
import type { ImportedJobDetails } from "./types";

interface GreenhouseJobResponse {
  title?: string;
  company_name?: string;
  absolute_url?: string;
  content?: string;
  first_published?: string;
  updated_at?: string;
  location?: { name?: string } | null;
  metadata?: { name?: string; value?: unknown }[] | null;
}

function prettifyToken(token: string): string {
  return token
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function metadataValue(
  metadata: GreenhouseJobResponse["metadata"],
  pattern: RegExp,
): string {
  const entry = metadata?.find((item) => pattern.test(item.name ?? ""));
  const value = entry?.value;
  if (Array.isArray(value)) return value.map(String).join(", ");
  return value === undefined || value === null ? "" : String(value);
}

function greenhouseDetails(
  job: GreenhouseJobResponse,
  inputUrl: string,
  token: string,
): ImportedJobDetails {
  const descriptionHtml = sanitizeJobHtml(decodeHtml(job.content ?? ""));
  const descriptionText = flattenHtml(descriptionHtml);
  const location = job.location?.name ?? "";
  const workplace =
    normalizeWorkplaceLabel(
      metadataValue(job.metadata, /location type|workplace/i),
    ) ??
    inferWorkplaceType(
      location,
      job.title ?? "",
      descriptionText,
    );

  return {
    provider: "greenhouse",
    sourceLabel: "Greenhouse",
    url: job.absolute_url || inputUrl,
    title: (job.title ?? "").trim(),
    company: (job.company_name ?? "").trim() || prettifyToken(token),
    location,
    descriptionHtml,
    descriptionText,
    employmentType:
      metadataValue(job.metadata, /employment type|job type/i) || undefined,
    workplaceType: workplace,
    salary:
      metadataValue(job.metadata, /salary|compensation|pay range/i) ||
      undefined,
    postedDate: job.first_published || job.updated_at || undefined,
  };
}

export async function fetchGreenhouseJob(
  token: string,
  id: string,
  inputUrl: string,
): Promise<ScraperResult<ImportedJobDetails>> {
  const api = `${APP_CONSTANTS.GREENHOUSE_BASE_URL}/${encodeURIComponent(
    token,
  )}/jobs/${encodeURIComponent(id)}`;
  const result = await fetchImportJson<GreenhouseJobResponse>(
    api,
    APP_CONSTANTS.GREENHOUSE_FETCH_TIMEOUT_MS,
  );
  if (!result.success) return result;

  const details = greenhouseDetails(result.data, inputUrl, token);
  if (!details.title) {
    return {
      success: false,
      error: { type: "parse", message: "The job board returned no title." },
    };
  }
  return { success: true, data: details };
}

interface LeverPostingResponse extends LeverPosting {
  description?: string;
  additional?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    interval?: string;
    currency?: string;
  } | null;
}

function leverDetails(
  posting: LeverPostingResponse,
  inputUrl: string,
  company: string,
): ImportedJobDetails {
  const descriptionHtml = sanitizeJobHtml(
    [
      posting.description,
      ...(posting.lists ?? []).map((section) => section.content),
      posting.additional,
    ]
      .filter(Boolean)
      .join(""),
  );
  const descriptionText = flattenHtml(descriptionHtml);

  const locations = posting.categories?.allLocations?.length
    ? posting.categories.allLocations
    : posting.categories?.location
      ? [posting.categories.location]
      : [];
  const location = locations.join(", ");

  const workplace =
    normalizeWorkplaceLabel(posting.workplaceType) ??
    inferWorkplaceType(location, posting.text ?? "", descriptionText);

  return {
    provider: "lever",
    sourceLabel: "Lever",
    url: posting.hostedUrl || inputUrl,
    title: (posting.text ?? "").trim(),
    company,
    location,
    descriptionHtml,
    descriptionText,
    employmentType: posting.categories?.commitment || undefined,
    workplaceType: workplace,
    salary: formatSalary(posting.salaryRange),
    postedDate: posting.createdAt
      ? new Date(posting.createdAt).toISOString()
      : undefined,
  };
}

/** Reads the company name from the posting page's JSON-LD/OpenGraph tags. */
export async function companyFromPage(url: string): Promise<string> {
  const page = await fetchImportPage(url);
  if (!page.success) return "";
  const extracted = extractJobFromHtml(page.data.text, page.data.url);
  return extracted.company || extracted.siteName || "";
}

export async function fetchLeverJob(
  token: string,
  id: string,
  inputUrl: string,
  eu = false,
): Promise<ScraperResult<ImportedJobDetails>> {
  const base = eu
    ? APP_CONSTANTS.LEVER_EU_BASE_URL
    : APP_CONSTANTS.LEVER_BASE_URL;
  const api = `${base}/${encodeURIComponent(token)}/${encodeURIComponent(id)}`;
  const result = await fetchImportJson<LeverPostingResponse>(
    api,
    APP_CONSTANTS.LEVER_FETCH_TIMEOUT_MS,
  );
  if (!result.success) return result;

  const company =
    (await companyFromPage(inputUrl)) || prettifyToken(token);
  const details = leverDetails(result.data, inputUrl, company);
  if (!details.title) {
    return {
      success: false,
      error: { type: "parse", message: "The job board returned no title." },
    };
  }
  return { success: true, data: details };
}

interface AshbyJobResponse {
  id?: string;
  title?: string;
  jobUrl?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  employmentType?: string;
  workplaceType?: string;
  publishedAt?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
}

interface AshbyBoardResponse {
  jobs?: AshbyJobResponse[];
}

function ashbyDetails(
  job: AshbyJobResponse,
  inputUrl: string,
  company: string,
): ImportedJobDetails {
  const descriptionHtml = sanitizeJobHtml(
    job.descriptionHtml ?? job.descriptionPlain ?? "",
  );
  const descriptionText = flattenHtml(descriptionHtml);
  const location = Array.from(
    new Set(
      [job.location, ...(job.secondaryLocations ?? []).map((o) => o.location)]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).join(", ");

  const workplace =
    normalizeWorkplaceLabel(job.workplaceType) ??
    inferWorkplaceType(location, job.title ?? "", descriptionText);

  return {
    provider: "ashby",
    sourceLabel: "Ashby",
    url: job.jobUrl || inputUrl,
    title: (job.title ?? "").trim(),
    company,
    location,
    descriptionHtml,
    descriptionText,
    employmentType: job.employmentType || undefined,
    workplaceType: workplace,
    postedDate: job.publishedAt || undefined,
  };
}

export async function fetchAshbyJob(
  token: string,
  id: string,
  inputUrl: string,
): Promise<ScraperResult<ImportedJobDetails>> {
  const api = `${APP_CONSTANTS.ASHBY_BASE_URL}/${encodeURIComponent(token)}`;
  const result = await fetchImportJson<AshbyBoardResponse>(
    api,
    APP_CONSTANTS.ASHBY_FETCH_TIMEOUT_MS,
  );
  if (!result.success) return result;

  const posting = (result.data.jobs ?? []).find((job) => job.id === id);
  if (!posting) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "This posting is no longer listed on the job board.",
      },
    };
  }

  const company =
    (await companyFromPage(inputUrl)) || prettifyToken(token);
  const details = ashbyDetails(posting, inputUrl, company);
  if (!details.title) {
    return {
      success: false,
      error: { type: "parse", message: "The job board returned no title." },
    };
  }
  return { success: true, data: details };
}

interface RipplingJobPost {
  uuid?: string;
  name?: string;
  description?: { company?: string; role?: string } | string | null;
  workLocations?: string[] | null;
  employmentType?: { id?: string; label?: string } | string | null;
  createdOn?: string;
  url?: string;
  companyName?: string | null;
  payRangeDetails?: unknown[] | null;
}

interface RipplingNextData {
  props?: {
    pageProps?: {
      apiData?: {
        jobPost?: RipplingJobPost | null;
        jobBoard?: { companyName?: string | null } | null;
        workLocations?: string[] | null;
      } | null;
    } | null;
  } | null;
}

/** Reads the JSON Next.js embeds in its `__NEXT_DATA__` script tag. */
function nextData(html: string): RipplingNextData | null {
  const match =
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as RipplingNextData;
  } catch {
    return null;
  }
}

function ripplingDescription(post: RipplingJobPost): string {
  const description = post.description;
  if (typeof description === "string") return description;
  if (description && typeof description === "object") {
    return [description.company, description.role].filter(Boolean).join("");
  }
  return "";
}

function ripplingEmploymentType(post: RipplingJobPost): string | undefined {
  const type = post.employmentType;
  if (!type) return undefined;
  if (typeof type === "string") return type;
  return type.id || type.label || undefined;
}

export async function fetchRipplingJob(
  token: string,
  id: string,
  inputUrl: string,
): Promise<ScraperResult<ImportedJobDetails>> {
  const page = await fetchImportPage(inputUrl);
  if (!page.success) return page;

  const api = nextData(page.data.text)?.props?.pageProps?.apiData;
  const post = api?.jobPost;
  if (!post?.name) {
    return {
      success: false,
      error: {
        type: "parse",
        message: "This posting is no longer available.",
      },
    };
  }

  const descriptionHtml = sanitizeJobHtml(ripplingDescription(post));
  const descriptionText = flattenHtml(descriptionHtml);
  const locations = post.workLocations?.length
    ? post.workLocations
    : api?.workLocations ?? [];
  const location = locations
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ");

  const company =
    (post.companyName ?? "").trim() ||
    (api?.jobBoard?.companyName ?? "").trim() ||
    prettifyToken(token);

  const salary =
    formatSalary(post.payRangeDetails?.[0]) ??
    salaryFromText(descriptionText);

  return {
    success: true,
    data: {
      provider: "rippling",
      sourceLabel: "Rippling",
      url: post.url || inputUrl,
      title: post.name.trim(),
      company,
      location,
      descriptionHtml,
      descriptionText,
      employmentType: ripplingEmploymentType(post),
      workplaceType: inferWorkplaceType(location, post.name, descriptionText),
      salary,
      postedDate: post.createdOn || undefined,
    },
  };
}
