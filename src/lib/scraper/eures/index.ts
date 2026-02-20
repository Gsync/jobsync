import type {
  DataSourceConnector,
  ConnectorResult,
  DiscoveredVacancy,
  SearchParams,
} from "../types";
import type { components } from "./generated";

type EuresSearchRequest = components["schemas"]["JobSearchRequest"];
type EuresSearchResponse = components["schemas"]["JobSearchResponse"];
type EuresVacancyDetail = components["schemas"]["JobVacancyDetail"];
import { translateEuresVacancy } from "./translator";
import {
  resilientFetch,
  BrokenCircuitError,
  TaskCancelledError,
  BulkheadRejectedError,
} from "./resilience";

const EURES_API_BASE = "https://europa.eu/eures/api";
const EURES_SEARCH_URL = `${EURES_API_BASE}/jv-searchengine/public/jv-search/search`;
const EURES_DETAIL_URL = `${EURES_API_BASE}/jv-searchengine/public/jv/id`;

function translateDetail(
  detail: EuresVacancyDetail,
  language: string,
): DiscoveredVacancy {
  const profile = detail.jvProfiles[language] ?? Object.values(detail.jvProfiles)[0];
  if (!profile) {
    return {
      title: "",
      employerName: "",
      location: "Europe",
      description: "",
      sourceUrl: `https://europa.eu/eures/portal/jv-se/jv-details/${detail.id}`,
      sourceBoard: "eures",
      externalId: detail.id,
    };
  }

  const location = profile.locations?.[0];
  const locationStr = location?.cityName && location?.countryCode
    ? `${location.cityName}, ${location.countryCode.toUpperCase()}`
    : location?.countryCode?.toUpperCase() ?? "Europe";

  return {
    title: profile.title ?? "",
    employerName: profile.employer?.name ?? "",
    location: locationStr,
    description: stripDetailHtml(profile.description ?? ""),
    sourceUrl: `https://europa.eu/eures/portal/jv-se/jv-details/${detail.id}`,
    sourceBoard: "eures",
    postedAt: detail.creationDate ? new Date(detail.creationDate) : undefined,
    employmentType: mapDetailScheduleCode(profile.positionScheduleCodes),
    externalId: detail.id,
    applicationDeadline: profile.lastApplicationDate ?? undefined,
    applicationInstructions: profile.applicationInstructions
      ? stripDetailHtml(profile.applicationInstructions.join("\n"))
      : undefined,
  };
}

function stripDetailHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapDetailScheduleCode(
  codes?: string[],
): "full_time" | "part_time" | "contract" | undefined {
  if (!codes || codes.length === 0) return undefined;
  const code = codes[0];
  switch (code) {
    case "FullTime": return "full_time";
    case "PartTime": return "part_time";
    case "FlexTime": return "part_time";
    default: return undefined;
  }
}

export function createEuresConnector(): DataSourceConnector {
  return {
    id: "eures",
    name: "EURES",
    requiresApiKey: false,

    async search(
      params: SearchParams,
    ): Promise<ConnectorResult<DiscoveredVacancy[]>> {
      try {
        const connectorParams = params.connectorParams ?? {};
        const requestLanguage = (connectorParams.language as string) ?? "en";
        const locationCodes = params.location
          ? [params.location.toLowerCase()]
          : [];

        const RESULTS_PER_PAGE = 50;
        const baseBody: EuresSearchRequest = {
          resultsPerPage: RESULTS_PER_PAGE,
          page: 1,
          sortSearch: "MOST_RECENT",
          keywords: [
            {
              keyword: params.keywords,
              specificSearchCode: "EVERYWHERE",
            },
          ],
          publicationPeriod: "LAST_WEEK",
          occupationUris: [],
          skillUris: [],
          requiredExperienceCodes: [],
          positionScheduleCodes: [],
          sectorCodes: [],
          educationAndQualificationLevelCodes: [],
          positionOfferingCodes: [],
          locationCodes,
          euresFlagCodes: [],
          otherBenefitsCodes: [],
          requiredLanguages: [],
          minNumberPost: null,
          sessionId: `jobsync-${Date.now()}`,
          userPreferredLanguage: null,
          requestLanguage,
        };

        const allVacancies: DiscoveredVacancy[] = [];
        let page = 1;

        while (true) {
          const data = await resilientFetch<EuresSearchResponse>(
            EURES_SEARCH_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ ...baseBody, page }),
            },
          );
          const jvs = data.jvs || [];

          if (jvs.length === 0) break;

          for (const jv of jvs) {
            allVacancies.push(translateEuresVacancy(jv, requestLanguage));
          }

          if (allVacancies.length >= data.numberRecords) break;

          page++;
        }

        return { success: true, data: allVacancies };
      } catch (error) {
        if (error instanceof BrokenCircuitError) {
          return {
            success: false,
            error: {
              type: "network" as const,
              message: "EURES API circuit breaker open — service temporarily unavailable",
            },
          };
        }
        if (error instanceof BulkheadRejectedError) {
          return {
            success: false,
            error: { type: "rate_limited" as const, retryAfter: 30 },
          };
        }
        if (error instanceof TaskCancelledError) {
          return {
            success: false,
            error: {
              type: "network" as const,
              message: "EURES API request timed out",
            },
          };
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: { type: "network", message } };
      }
    },

    async getDetails(
      externalId: string,
    ): Promise<ConnectorResult<DiscoveredVacancy>> {
      try {
        const detail = await resilientFetch<EuresVacancyDetail>(
          `${EURES_DETAIL_URL}/${encodeURIComponent(externalId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );

        return { success: true, data: translateDetail(detail, "en") };
      } catch (error) {
        if (error instanceof BrokenCircuitError) {
          return {
            success: false,
            error: {
              type: "network" as const,
              message: "EURES API circuit breaker open — service temporarily unavailable",
            },
          };
        }
        if (error instanceof BulkheadRejectedError) {
          return {
            success: false,
            error: { type: "rate_limited" as const, retryAfter: 30 },
          };
        }
        if (error instanceof TaskCancelledError) {
          return {
            success: false,
            error: {
              type: "network" as const,
              message: "EURES API request timed out",
            },
          };
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: { type: "network", message } };
      }
    },
  };
}
