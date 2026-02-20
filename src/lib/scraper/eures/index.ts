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

        const body: EuresSearchRequest = {
          resultsPerPage: 10,
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

        const response = await fetch(EURES_SEARCH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return {
              success: false,
              error: { type: "rate_limited", retryAfter: 60 },
            };
          }
          return {
            success: false,
            error: {
              type: "network",
              message: `EURES API error: ${response.status} ${response.statusText}`,
            },
          };
        }

        const data: EuresSearchResponse = await response.json();
        const vacancies = (data.jvs || []).map((jv) =>
          translateEuresVacancy(jv, requestLanguage),
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
