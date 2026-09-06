import pLimit from "p-limit";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails, ScraperResult } from "../types";
import { errorReason } from "../utils";
import type { AshbyBoardResponse } from "./types";
import { mapAshbyJob } from "./mapper";

// Fetch every listed posting for one board. Ashby returns the whole board in a
// single response, so there is no pagination loop (unlike Lever).
export async function fetchAshbyBoardJobs(
  name: string,
  token: string,
): Promise<ScraperResult<JobDetails[]>> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    APP_CONSTANTS.ASHBY_FETCH_TIMEOUT_MS,
  );

  try {
    const url = `${APP_CONSTANTS.ASHBY_BASE_URL}/${encodeURIComponent(token)}`;
    const response = await fetch(url, { signal: controller.signal });

    // 429 is distinct so the run surfaces the existing "rate limited" label.
    if (response.status === 429) {
      return { success: false, error: { type: "rate_limited" } };
    }
    if (!response.ok) {
      return {
        success: false,
        error: {
          type: "network",
          message: `Board '${token}' returned ${response.status}`,
        },
      };
    }

    const data: AshbyBoardResponse = await response.json();
    if (data.jobs !== undefined && !Array.isArray(data.jobs)) {
      return {
        success: false,
        error: { type: "parse", message: `Board '${token}' malformed payload` },
      };
    }

    // Company name isn't in the payload — carry it from the seed/user.
    const jobs = (data.jobs ?? [])
      .filter((job) => job.isListed !== false)
      .map((job) => mapAshbyJob(job, name));

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
// Mirrors searchGreenhouseJobs / searchLeverJobs.
export async function searchAshbyJobs(
  companies: { name: string; token: string }[],
): Promise<{ jobs: JobDetails[]; errors: { token: string; reason: string }[] }> {
  const limit = pLimit(APP_CONSTANTS.ASHBY_FETCH_CONCURRENCY);

  const settled = await Promise.allSettled(
    companies.map(({ name, token }) =>
      limit(() => fetchAshbyBoardJobs(name, token)),
    ),
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
        result.reason instanceof Error ? result.reason.message : "Unknown error";
      errors.push({ token, reason });
    }
  });

  return { jobs, errors };
}
