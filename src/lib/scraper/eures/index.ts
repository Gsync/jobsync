import type {
  DataSourceConnector,
  ConnectorResult,
  DiscoveredVacancy,
  SearchParams,
} from "../types";
import type { components } from "./generated";

type EuresSearchRequest = components["schemas"]["JobSearchRequest"];
type EuresSearchResponse = components["schemas"]["JobSearchResponse"];
import { translateEuresVacancy } from "./translator";
import {
  resilientFetch,
  BrokenCircuitError,
  TaskCancelledError,
  BulkheadRejectedError,
} from "./resilience";

const EURES_API_BASE = "https://europa.eu/eures/api";
const EURES_SEARCH_URL = `${EURES_API_BASE}/jv-searchengine/public/jv-search/search`;

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
  };
}
