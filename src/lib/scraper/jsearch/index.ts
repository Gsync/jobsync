import type {
  JobSearchResult,
  JobDetails,
  ScraperResult,
  ScraperService,
} from "../types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_publisher: string;
  job_employment_type: string;
  job_apply_link: string;
  job_description: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc: string;
  job_city: string;
  job_state: string;
  job_country: string;
  job_location: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_period: string | null;
}

interface JSearchResponse {
  status: string;
  request_id: string;
  data: JSearchJob[];
}

export function createJSearchProvider(rapidApiKey?: string): ScraperService {
  const apiKey = rapidApiKey || RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }

  return {
    boardId: "jsearch",
    boardName: "JSearch",

    async search(
      keywords: string,
      location: string,
    ): Promise<ScraperResult<JobSearchResult[]>> {
      try {
        const url = new URL(`${JSEARCH_BASE_URL}/search`);
        url.searchParams.set("query", `${keywords} in ${location}`);
        url.searchParams.set("page", "1");
        url.searchParams.set("num_pages", "1");
        url.searchParams.set("date_posted", "week");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        });
        console.log("JOBS API RESPONSE: ", response);

        if (!response.ok) {
          if (response.status === 429) {
            return {
              success: false,
              error: { type: "rate_limited", retryAfter: 60 },
            };
          }
          if (response.status === 403) {
            return {
              success: false,
              error: {
                type: "blocked",
                reason: "API access denied - check your RapidAPI key",
              },
            };
          }
          return {
            success: false,
            error: {
              type: "network",
              message: `API error: ${response.status} ${response.statusText}`,
            },
          };
        }

        const data: JSearchResponse = await response.json();

        const jobs: JobSearchResult[] = (data.data || []).map((job) => ({
          title: job.job_title,
          company: job.employer_name,
          location: job.job_location || `${job.job_city}, ${job.job_state}`,
          url: job.job_apply_link,
          snippet: job.job_description?.slice(0, 200),
        }));

        return { success: true, data: jobs };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: { type: "network", message } };
      }
    },

    async extract(url: string): Promise<ScraperResult<JobDetails>> {
      // JSearch returns full job details in search results
      // This method exists for interface compatibility
      // In practice, we use searchWithDetails instead
      return {
        success: false,
        error: {
          type: "parse",
          message: "Use searchWithDetails for JSearch - extract not supported",
        },
      };
    },

    async close(): Promise<void> {
      // No cleanup needed for API-based provider
    },
  };
}

// Extended search that returns full job details (no separate extract needed)
export async function searchJSearchJobs(
  keywords: string,
  location: string,
  rapidApiKey?: string,
): Promise<ScraperResult<JobDetails[]>> {
  const apiKey = rapidApiKey || RAPIDAPI_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: { type: "network", message: "RAPIDAPI_KEY is not configured" },
    };
  }

  try {
    const url = new URL(`${JSEARCH_BASE_URL}/search`);
    url.searchParams.set("query", `${keywords} in ${location}`);
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("date_posted", "week");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: { type: "rate_limited", retryAfter: 60 },
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          error: {
            type: "blocked",
            reason: "API access denied - check your RapidAPI key",
          },
        };
      }
      return {
        success: false,
        error: {
          type: "network",
          message: `API error: ${response.status} ${response.statusText}`,
        },
      };
    }

    const data: JSearchResponse = await response.json();

    const jobs: JobDetails[] = (data.data || []).map((job) => ({
      title: job.job_title,
      company: job.employer_name,
      location: job.job_location || `${job.job_city}, ${job.job_state}`,
      description: job.job_description,
      url: job.job_apply_link,
      postedDate: job.job_posted_at_datetime_utc,
      salary: formatSalary(job),
    }));

    return { success: true, data: jobs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: { type: "network", message } };
  }
}

function formatSalary(job: JSearchJob): string | undefined {
  if (!job.job_min_salary && !job.job_max_salary) {
    return undefined;
  }

  const min = job.job_min_salary;
  const max = job.job_max_salary;
  const period = job.job_salary_period || "year";

  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()} per ${period}`;
  }
  if (min) {
    return `From $${min.toLocaleString()} per ${period}`;
  }
  if (max) {
    return `Up to $${max.toLocaleString()} per ${period}`;
  }
  return undefined;
}
