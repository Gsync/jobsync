import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { APP_CONSTANTS } from "@/lib/constants";
import { decodeHtml, htmlToText } from "./html";
import type { JobDetails, ScraperError, ScraperResult } from "./types";
import { normalizeJobUrl } from "./utils";

// Reads ONE job posting from a URL supplied by the user. The ATS modules in
// this folder read whole boards from known APIs; this one is the fallback for
// an arbitrary careers page, so it has to be defensive about both the network
// (SSRF, redirects, size, timeout) and the extraction (unstructured pages).

export interface ScrapedJobPosting extends JobDetails {
  source?: string;
  descriptionTruncated?: boolean;
  structuredData?: boolean;
  skills?: string[];
  warnings?: string[];
}

type JsonObject = Record<string, unknown>;

type CacheEntry = { value: ScrapedJobPosting; expiresAt: number };

// Small, process-local cache. scrape_job and add_job both read the same URL,
// and on a local model the second call is often seconds later. Bounded so a
// long-lived container cannot accumulate whole postings forever.
const cache = new Map<string, CacheEntry>();

export function clearJobPostingCache(): void {
  cache.clear();
}

function readCache(url: string): ScrapedJobPosting | undefined {
  const key = normalizeJobUrl(url);
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  // Refresh insertion order so the oldest key is the one evicted.
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function writeCache(url: string, value: ScrapedJobPosting): void {
  const key = normalizeJobUrl(url);
  if (cache.size >= APP_CONSTANTS.SCRAPE_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + APP_CONSTANTS.SCRAPE_CACHE_TTL_MS,
  });
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function decodeAttribute(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const attribute =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attribute.exec(tag))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes.set(name, decodeAttribute(value));
  }
  return attributes;
}

function parseMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const meta = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = meta.exec(html))) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content");
    if (key && content && !tags.has(key)) tags.set(key, content);
  }
  return tags;
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match ? htmlToText(match[1] ?? "") : undefined;
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const script =
    /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = script.exec(html))) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // A malformed block must not hide a valid one beside it.
    }
  }
  return blocks;
}

function findJobPostingNode(value: unknown, depth = 0): JsonObject | undefined {
  if (depth > 8 || value === null || typeof value !== "object") return undefined;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findJobPostingNode(entry, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  const object = value as JsonObject;
  const types = asArray(object["@type"]).map((type) => asString(type)?.toLowerCase());
  if (types.some((type) => type === "jobposting")) return object;

  for (const entry of Object.values(object)) {
    const found = findJobPostingNode(entry, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function findJobPosting(html: string): JsonObject | undefined {
  for (const block of jsonLdBlocks(html)) {
    const found = findJobPostingNode(block);
    if (found) return found;
  }
  return undefined;
}

function organizationName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return decodeAttribute(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const name = organizationName(entry);
      if (name) return name;
    }
    return undefined;
  }

  if (typeof value === "object") {
    const object = value as JsonObject;
    return (
      asString(object.name) ??
      asString(object.legalName) ??
      organizationName(object["@id"])
    );
  }
  return undefined;
}

function addressText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return decodeAttribute(value);
  if (typeof value !== "object") return undefined;

  const address = value as JsonObject;
  const city = asString(address.addressLocality);
  const region = asString(address.addressRegion);
  const country = organizationName(address.addressCountry);
  const parts = [city, region].filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(", ");
  return country;
}

function locationFromJob(job: JsonObject): string | undefined {
  const locations = asArray(job.jobLocation);
  for (const location of locations) {
    if (typeof location === "string") {
      const text = decodeAttribute(location);
      if (text) return text;
      continue;
    }
    if (!location || typeof location !== "object") continue;

    const object = location as JsonObject;
    const direct = addressText(object);
    if (direct) return direct;

    const address = object.address;
    const fromAddress = addressText(address);
    if (fromAddress) return fromAddress;

    const name = asString(object.name);
    if (name) return name;
  }

  const requirements = asArray(job.applicantLocationRequirements);
  for (const requirement of requirements) {
    if (typeof requirement === "string") return decodeAttribute(requirement);
    if (requirement && typeof requirement === "object") {
      const name = asString((requirement as JsonObject).name);
      if (name) return name;
    }
  }
  return undefined;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function salaryFromJob(job: JsonObject): string | undefined {
  const base = job.baseSalary;
  if (!base) return undefined;

  const object =
    Array.isArray(base) && base.length > 0
      ? (base[0] as JsonObject)
      : typeof base === "object"
        ? (base as JsonObject)
        : undefined;
  if (!object) return undefined;

  const valueObject =
    object.value && typeof object.value === "object"
      ? (object.value as JsonObject)
      : object;
  const currency =
    asString(valueObject.currency) ?? asString(object.currency) ?? "";
  const unit = asString(valueObject.unitText) ?? asString(object.unitText) ?? "";

  const min = asString(valueObject.minValue);
  const max = asString(valueObject.maxValue);
  const single = asString(valueObject.value);

  const unitLabel = /year|annual/i.test(unit)
    ? "per year"
    : /hour/i.test(unit)
      ? "per hour"
      : /month/i.test(unit)
        ? "per month"
        : unit
          ? `per ${unit.toLowerCase()}`
          : "";

  const symbol =
    currency.toUpperCase() === "USD" || currency.toUpperCase() === "CAD"
      ? "$"
      : currency.toUpperCase() === "GBP"
        ? "£"
        : currency.toUpperCase() === "EUR"
          ? "€"
          : currency
            ? `${currency} `
            : "";

  const numbers = (raw: string): number | undefined => {
    const parsed = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const minValue = min ? numbers(min) : undefined;
  const maxValue = max ? numbers(max) : undefined;
  const singleValue = single ? numbers(single) : undefined;

  let range: string | undefined;
  if (minValue !== undefined && maxValue !== undefined) {
    range = `${symbol}${formatMoney(minValue)} – ${symbol}${formatMoney(maxValue)}`;
  } else if (singleValue !== undefined) {
    range = `${symbol}${formatMoney(singleValue)}`;
  }
  if (!range) return undefined;
  return unitLabel ? `${range} ${unitLabel}` : range;
}

function jobTypeFromJob(job: JsonObject): string | undefined {
  for (const entry of asArray(job.employmentType)) {
    const value = asString(entry)?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    if (value.includes("full")) return "Full-time";
    if (value.includes("part")) return "Part-time";
    if (
      value.includes("contract") ||
      value.includes("freelance") ||
      value.includes("temporary") ||
      value.includes("intern")
    ) {
      return "Contract";
    }
  }
  return undefined;
}

function workplaceTypeFromJob(
  job: JsonObject,
  location: string | undefined,
  description: string,
): string | undefined {
  const remoteFlag = [
    asString(job.jobLocationType),
    asString(job.workplaceType),
    ...asArray(job.employmentType).map((entry) => asString(entry)),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (/telecommute|remote/i.test(remoteFlag)) return "Remote";

  const text = `${location ?? ""} ${description.slice(0, 1_500)}`;
  if (/\bremote\b/i.test(text)) return "Remote";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  if (/\bon[- ]?site\b/i.test(text)) return "Onsite";
  return undefined;
}

function skillsFromJob(job: JsonObject): string[] | undefined {
  const raw = job.skills ?? job.qualifications;
  const values = asArray(raw)
    .flatMap((entry) => {
      const text = asString(entry);
      return text ? text.split(/[,;|]/) : [];
    })
    .map((skill) => skill.replace(/\s+/g, " ").trim())
    .filter((skill) => skill.length >= 2 && skill.length <= 50);

  const unique = Array.from(new Set(values)).slice(0, 10);
  return unique.length > 0 ? unique : undefined;
}

const JOB_BOARD_SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)linkedin\.com$/i, "LinkedIn"],
  [/(^|\.)indeed\./i, "Indeed"],
  [/(^|\.)glassdoor\./i, "Glassdoor"],
  [/(^|\.)ziprecruiter\./i, "ZipRecruiter"],
  [/(^|\.)simplyhired\./i, "SimplyHired"],
  [/(^|\.)monster\.com$/i, "Monster"],
  [/(^|\.)dice\.com$/i, "Dice"],
  [/(^|\.)wellfound\.com$/i, "Wellfound"],
  [/(^|\.)greenhouse\.io$/i, "Greenhouse"],
  [/(^|\.)lever\.co$/i, "Lever"],
  [/(^|\.)ashbyhq\.com$/i, "Ashby"],
  [/(^|\.)myworkdayjobs\.com$/i, "Workday"],
  [/(^|\.)smartrecruiters\.com$/i, "SmartRecruiters"],
  [/(^|\.)icims\.com$/i, "iCIMS"],
  [/(^|\.)taleo\.net$/i, "Taleo"],
  [/(^|\.)jobvite\.com$/i, "Jobvite"],
  [/(^|\.)bamboohr\.com$/i, "BambooHR"],
  [/(^|\.)recruitee\.com$/i, "Recruitee"],
  [/(^|\.)workable\.com$/i, "Workable"],
];

const JOB_BOARD_NAMES = new Set(
  JOB_BOARD_SOURCES.map(([, name]) => name.toLowerCase().replace(/[^a-z]/g, "")),
);

function sourceForHost(host: string): string | undefined {
  for (const [pattern, name] of JOB_BOARD_SOURCES) {
    if (pattern.test(host)) return name;
  }
  return undefined;
}

function brandFromHost(host: string): string | undefined {
  const labels = host
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".")
    .filter(Boolean);
  if (labels.length < 2) return undefined;

  const secondLevel = labels[labels.length - 2] ?? "";
  const commonSecondLevels = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);
  const index =
    labels.length >= 3 && commonSecondLevels.has(secondLevel) ? labels.length - 3 : labels.length - 2;
  const brand = labels[index];
  if (!brand) return undefined;
  return brand
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function companyFromRawTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const match = title.match(/\s+(?:at|@|with)\s+([^|•·–—]+?)(?:\s*[|•·–—]|$)/i);
  if (!match) return undefined;
  const company = match[1].replace(/\s+/g, " ").trim();
  return company || undefined;
}

const ROLE_WORDS =
  /\b(engineer|developer|designer|manager|analyst|scientist|director|specialist|coordinator|consultant|architect|lead|intern|administrator|officer|assistant|representative|technician|accountant|nurse|teacher|sales|marketing|product|operations|support|writer|editor|recruiter|researcher|associate)\b/i;

function pickTitlePart(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const rolePart = parts.find((part) => ROLE_WORDS.test(part));
  if (rolePart) return rolePart;
  return parts[0];
}

function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let title = decodeAttribute(raw);

  const parts = title
    .split(/\s+[|•·]\s+|\s+[–—]\s+|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) title = pickTitlePart(parts);

  title = title
    .replace(/^job\s*[:\-–—]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return title || undefined;
}

function stripCompanyFromTitle(title: string, company: string | undefined): string {
  if (!company) return title;
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title
    .replace(new RegExp(`\\s+(?:at|@|with)\\s+${escaped}\\s*$`, "i"), "")
    .trim();
}

function extractTitle(html: string): string | undefined {
  return firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
}

function extractH1(html: string): string | undefined {
  return firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
}

function mainHtml(html: string): string | undefined {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (article) return article[1];
  return undefined;
}

function metaDescription(meta: Map<string, string>): string | undefined {
  const raw =
    meta.get("og:description") ??
    meta.get("twitter:description") ??
    meta.get("description");
  if (!raw) return undefined;
  return htmlToText(raw);
}

function companyFromMeta(meta: Map<string, string>, host: string): string | undefined {
  const siteName = meta.get("og:site_name") ?? meta.get("application-name");
  if (siteName) {
    const folded = siteName.toLowerCase().replace(/[^a-z]/g, "");
    if (!JOB_BOARD_NAMES.has(folded) && !/careers|jobs|job board|hiring/i.test(siteName)) {
      return siteName;
    }
  }
  const board = sourceForHost(host);
  if (!board) return brandFromHost(host);
  return undefined;
}

function sourceFromMeta(
  meta: Map<string, string>,
  host: string,
  company: string | undefined,
): string {
  const board = sourceForHost(host);
  if (board) return board;

  const siteName = meta.get("og:site_name") ?? meta.get("application-name");
  if (siteName && !JOB_BOARD_NAMES.has(siteName.toLowerCase().replace(/[^a-z]/g, ""))) {
    return siteName;
  }

  return brandFromHost(host) ?? company ?? host;
}

const BLOCKED_MARKERS = [
  "just a moment",
  "checking your browser",
  "enable javascript",
  "enable cookies",
  "access denied",
  "captcha",
  "are you a robot",
  "verify you are human",
  "unusual traffic",
  "sign in to continue",
  "login required",
];

function looksBlocked(html: string, title: string | undefined): boolean {
  const head = `${title ?? ""} ${htmlToText(html.slice(0, 5_000))}`.toLowerCase();
  return BLOCKED_MARKERS.some((marker) => head.includes(marker));
}

// Pure extraction, exported so it can be tested without the network. `url`
// is used for provenance and source/company fallbacks only.
export function extractJobPosting(html: string, url: string): ScrapedJobPosting {
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");
  const meta = parseMetaTags(html);
  const job = findJobPosting(html);

  const rawTitle =
    asString(job?.title) ??
    meta.get("og:title") ??
    meta.get("twitter:title") ??
    extractH1(html) ??
    extractTitle(html);

  const company =
    organizationName(job?.hiringOrganization) ??
    companyFromRawTitle(rawTitle) ??
    companyFromMeta(meta, host);

  let title = cleanTitle(rawTitle);
  if (title && company) title = stripCompanyFromTitle(title, company);

  const location =
    locationFromJob(job ?? {}) ??
    (title && /\bremote\b/i.test(title) ? "Remote" : undefined);

  const structuredDescription = asString(job?.description);
  const structuredText = structuredDescription
    ? htmlToText(structuredDescription)
    : undefined;

  const main = mainHtml(html);
  const bodyText = htmlToText(main ?? html);
  const metaText = metaDescription(meta);

  let description = structuredText ?? "";
  if (!structuredText) {
    const fallback =
      bodyText.length > 0 ? bodyText : metaText ?? bodyText;
    description = fallback;
  }

  let descriptionTruncated = false;
  if (description.length > APP_CONSTANTS.SCRAPE_MAX_DESCRIPTION_CHARS) {
    description = description.slice(0, APP_CONSTANTS.SCRAPE_MAX_DESCRIPTION_CHARS);
    descriptionTruncated = true;
  }

  const salary = salaryFromJob(job ?? {});
  const jobType = jobTypeFromJob(job ?? {});
  const workplaceType = workplaceTypeFromJob(job ?? {}, location, description);
  const skills = skillsFromJob(job ?? {});
  const source = sourceFromMeta(meta, host, company);

  const warnings: string[] = [];
  if (!company) warnings.push("The company name could not be read from the page.");
  if (!structuredText) {
    warnings.push(
      "This page did not publish structured job data, so the details were inferred from the visible text.",
    );
  }
  if (descriptionTruncated) {
    warnings.push("The posting was very long, so its description was shortened.");
  }

  return {
    title: title ?? "",
    company: company ?? "",
    location: location ?? "",
    description,
    url: normalizeJobUrl(url),
    postedDate: asString(job?.datePosted),
    salary,
    employmentType: jobType,
    workplaceType,
    isRemote: workplaceType === "Remote" ? true : undefined,
    source,
    structuredData: Boolean(job),
    skills,
    descriptionTruncated,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;

  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("ff")) return true;

  const mapped = lower.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

function isDisallowedHostname(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "metadata.google.internal") return true;
  if (host === "0.0.0.0") return true;
  return false;
}

type SafeUrl = { ok: true; url: URL } | { ok: false; reason: string };

async function safeHttpUrl(raw: string): Promise<SafeUrl> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That does not look like a valid link." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links can be read." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Links with embedded credentials cannot be read." };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "That link uses a port that cannot be read." };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, reason: "That link has no host." };
  if (isDisallowedHostname(host)) {
    return { ok: false, reason: "That address is not allowed." };
  }

  const literal = isIP(host);
  let addresses: string[];
  if (literal) {
    addresses = [host];
  } else {
    try {
      const resolved = await lookup(host, { all: true });
      addresses = resolved.map((entry) => entry.address);
    } catch {
      return { ok: false, reason: "That address could not be resolved." };
    }
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "That address could not be resolved." };
  }
  if (addresses.some((address) => isPrivateAddress(address))) {
    return { ok: false, reason: "That address is not allowed." };
  }

  return { ok: true, url };
}

async function readBody(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: await response.text(), truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const remaining = maxBytes - bytes;
    if (value.byteLength > remaining) {
      text += decoder.decode(value.subarray(0, Math.max(0, remaining)), {
        stream: true,
      });
      await reader.cancel().catch(() => undefined);
      return { text: text + decoder.decode(), truncated: true };
    }

    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }

  return { text: text + decoder.decode(), truncated: false };
}

function errorResult(error: ScraperError): ScraperResult<ScrapedJobPosting> {
  return { success: false, error };
}

// Fetches and extracts one posting. Expected failures are returned, never
// thrown, so the tool can turn them into a readable result for both the model
// and the user. `signal` lets the chat turn's abort stop the request too.
export async function scrapeJobPosting(
  rawUrl: string,
  options: { signal?: AbortSignal; bypassCache?: boolean } = {},
): Promise<ScraperResult<ScrapedJobPosting>> {
  if (!options.bypassCache) {
    const cached = readCache(rawUrl);
    if (cached) return { success: true, data: cached };
  }

  const initial = await safeHttpUrl(rawUrl);
  if (!initial.ok) return errorResult({ type: "blocked", reason: initial.reason });

  const timeout = AbortSignal.timeout(APP_CONSTANTS.SCRAPE_FETCH_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;

  let current = initial.url;

  try {
    for (let redirect = 0; redirect <= APP_CONSTANTS.SCRAPE_MAX_REDIRECTS; redirect++) {
      const response = await fetch(current.toString(), {
        redirect: "manual",
        signal,
        headers: {
          "user-agent": APP_CONSTANTS.SCRAPE_USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
          "accept-language": "en-US,en;q=0.9",
        },
      });

      if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return errorResult({
            type: "network",
            message: `The page redirected without a destination (HTTP ${response.status}).`,
          });
        }

        const next = new URL(location, current);
        const safe = await safeHttpUrl(next.toString());
        if (!safe.ok) return errorResult({ type: "blocked", reason: safe.reason });
        current = safe.url;
        continue;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return errorResult({
            type: "blocked",
            reason: `The page refused the request (HTTP ${response.status}).`,
          });
        }
        if (response.status === 429) {
          return errorResult({
            type: "rate_limited",
            retryAfter: Number(response.headers.get("retry-after")) || undefined,
          });
        }
        return errorResult({
          type: "network",
          message: `The page returned HTTP ${response.status}.`,
        });
      }

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (
        contentType &&
        !/text\/html|application\/xhtml\+xml|text\/plain/.test(contentType)
      ) {
        return errorResult({
          type: "parse",
          message: "That link is not an HTML page.",
        });
      }

      const body = await readBody(response, APP_CONSTANTS.SCRAPE_MAX_BYTES);
      if (!body.text.trim()) {
        return errorResult({
          type: "parse",
          message: "The page was empty.",
        });
      }

      const extracted = extractJobPosting(body.text, current.toString());
      if (looksBlocked(body.text, extracted.title) && extracted.description.length < 200) {
        return errorResult({
          type: "blocked",
          reason: "The page looks like a login or bot-check page rather than the posting.",
        });
      }

      if (body.truncated) {
        extracted.warnings = [
          ...(extracted.warnings ?? []),
          "The page was very large, so only its opening portion was read.",
        ];
      }

      writeCache(current.toString(), extracted);
      return { success: true, data: extracted };
    }

    return errorResult({
      type: "network",
      message: "The page redirected too many times.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResult({
        type: "network",
        message: signal.aborted ? "Reading the page timed out." : "Reading the page was cancelled.",
      });
    }
    return errorResult({
      type: "network",
      message:
        error instanceof Error
          ? `The page could not be read: ${error.message}`
          : "The page could not be read.",
    });
  }
}
