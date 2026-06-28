import pLimit from "p-limit";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails, ScraperError, ScraperResult } from "../types";

interface GreenhouseJob {
  title?: string;
  company_name?: string;
  location?: { name?: string } | null;
  absolute_url: string;
  content?: string;
  first_published?: string;
  updated_at?: string;
}

interface GreenhouseBoardResponse {
  jobs?: GreenhouseJob[];
  meta?: { total?: number };
}

const NAMED_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&amp;": "&", // keep ampersand last so it does not undo other entities
};

function decodeEntities(input: string): string {
  let out = input;
  // Numeric entities first (decimal + hex).
  out = out.replace(/&#(\d+);/g, (_, code) =>
    String.fromCodePoint(Number(code)),
  );
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCodePoint(parseInt(code, 16)),
  );
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  return out;
}

// Greenhouse `content` is HTML-entity-encoded HTML. Decode the entities back to
// real tags, strip the tags, then decode once more for any entities that lived
// inside the text, and collapse whitespace. Used for AI text processing.
export function flattenHtml(raw: string): string {
  if (!raw) return "";
  let text = decodeEntities(raw);
  text = text.replace(/<[^>]*>/g, " ");
  text = decodeEntities(text);
  return text.replace(/\s+/g, " ").trim();
}

// Decodes entity-encoded HTML back to real HTML tags for display rendering.
function decodeHtml(raw: string): string {
  if (!raw) return "";
  const decoded = decodeEntities(raw);
  // Second pass decodes any entities inside tag attribute values
  return decodeEntities(decoded);
}

function mapGreenhouseJob(job: GreenhouseJob): JobDetails {
  return {
    title: (job.title ?? "").trim(),
    company: job.company_name ?? "",
    location: job.location?.name ?? "",
    description: decodeHtml(job.content ?? ""),
    url: job.absolute_url,
    postedDate: job.first_published || job.updated_at,
  };
}

function errorReason(error: ScraperError): string {
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

// Fetch all published jobs for one board with full content.
export async function fetchBoardJobs(
  token: string,
): Promise<ScraperResult<JobDetails[]>> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    APP_CONSTANTS.GREENHOUSE_FETCH_TIMEOUT_MS,
  );

  try {
    const url = `${APP_CONSTANTS.GREENHOUSE_BASE_URL}/${encodeURIComponent(
      token,
    )}/jobs?content=true`;

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return {
        success: false,
        error: {
          type: "network",
          message: `Board '${token}' returned ${response.status}`,
        },
      };
    }

    const data: GreenhouseBoardResponse = await response.json();
    const jobs = (data.jobs ?? []).map(mapGreenhouseJob);
    return { success: true, data: jobs };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: { type: "network", message: `Board '${token}' timed out` },
      };
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: { type: "network", message } };
  } finally {
    clearTimeout(timer);
  }
}

// Fetch a watchlist in parallel (bounded concurrency) with per-token isolation.
export async function searchGreenhouseJobs(
  companies: { name: string; token: string }[],
): Promise<{ jobs: JobDetails[]; errors: { token: string; reason: string }[] }> {
  const limit = pLimit(APP_CONSTANTS.GREENHOUSE_FETCH_CONCURRENCY);

  const settled = await Promise.allSettled(
    companies.map(({ token }) => limit(() => fetchBoardJobs(token))),
  );

  const jobs: JobDetails[] = [];
  const errors: { token: string; reason: string }[] = [];

  settled.forEach((result, index) => {
    const token = companies[index].token;
    if (result.status === "fulfilled") {
      if (result.value.success) {
        jobs.push(...result.value.data);
      } else {
        errors.push({ token, reason: errorReason(result.value.error) });
      }
    } else {
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown error";
      errors.push({ token, reason });
    }
  });

  return { jobs, errors };
}
