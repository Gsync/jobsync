import type {
  DataSourceConnector,
  ConnectorResult,
  DiscoveredVacancy,
  SearchParams,
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

export function createJSearchConnector(): DataSourceConnector {
  return {
    id: "jsearch",
    name: "JSearch",
    requiresApiKey: true,

    async search(
      params: SearchParams,
    ): Promise<ConnectorResult<DiscoveredVacancy[]>> {
      if (!RAPIDAPI_KEY) {
        return {
          success: false,
          error: {
            type: "network",
            message: "RAPIDAPI_KEY is not configured",
          },
        };
      }

      try {
        const url = new URL(`${JSEARCH_BASE_URL}/search`);
        url.searchParams.set(
          "query",
          `${params.keywords} in ${params.location}`,
        );
        url.searchParams.set("page", "1");
        url.searchParams.set("num_pages", "1");
        url.searchParams.set("date_posted", "week");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
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
        const vacancies: DiscoveredVacancy[] = (data.data || []).map(
          translateJSearchJob,
        );

        return { success: true, data: vacancies };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: { type: "network", message } };
      }
    },
  };
}

function translateJSearchJob(job: JSearchJob): DiscoveredVacancy {
  return {
    title: job.job_title,
    employerName: job.employer_name,
    location: job.job_location || `${job.job_city}, ${job.job_state}`,
    description: job.job_description,
    sourceUrl: job.job_apply_link,
    sourceBoard: "jsearch",
    postedAt: job.job_posted_at_datetime_utc
      ? new Date(job.job_posted_at_datetime_utc)
      : undefined,
    salary: formatSalary(job),
    employmentType: job.job_employment_type?.toLowerCase(),
    externalId: job.job_id,
  };
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
