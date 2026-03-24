import type {
  DataSourceConnector,
  ConnectorResult,
  DiscoveredVacancy,
  SearchParams,
} from "../types";
import type {
  ArbeitsagenturSearchResponse,
  ArbeitsagenturJob,
  ArbeitsagenturJobDetail,
} from "./types";
import {
  resilientFetch,
  ArbeitsagenturApiError,
} from "./resilience";

const API_BASE =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const SEARCH_URL = `${API_BASE}/pc/v4/jobs`;
const DETAIL_URL = `${API_BASE}/pc/v4/jobdetails`;
const API_KEY = "jobboerse-jobsuche";

/** Maximum results per page (API-imposed limit). */
const PAGE_SIZE = 50;

/**
 * Build the public detail URL for a job listing.
 * Uses hashId when available (detail response), falls back to refnr-based search URL.
 */
function buildDetailUrl(hashId?: string, refnr?: string): string {
  if (hashId) {
    return `https://www.arbeitsagentur.de/jobsuche/suche?id=${encodeURIComponent(hashId)}`;
  }
  if (refnr) {
    return `https://www.arbeitsagentur.de/jobsuche/suche?was=${encodeURIComponent(refnr)}`;
  }
  return "https://www.arbeitsagentur.de/jobsuche";
}

/**
 * Map Arbeitsagentur `arbeitszeit` code to the canonical employment type.
 *
 *   vz  = Vollzeit  (full-time)
 *   tz  = Teilzeit  (part-time)
 *   snw = Schicht/Nacht/Wochenende
 *   mj  = Mini-Job
 *   ho  = Home-Office
 */
function mapEmploymentType(
  arbeitszeit?: string,
): "full_time" | "part_time" | "contract" | undefined {
  if (!arbeitszeit) return undefined;
  switch (arbeitszeit.toLowerCase()) {
    case "vz":
      return "full_time";
    case "tz":
      return "part_time";
    default:
      return undefined;
  }
}

/**
 * Build a human-readable location string from the API location object.
 */
function buildLocationString(arbeitsort: ArbeitsagenturJob["arbeitsort"]): string {
  const parts: string[] = [];
  if (arbeitsort.ort) parts.push(arbeitsort.ort);
  if (arbeitsort.region && arbeitsort.region !== arbeitsort.ort) {
    parts.push(arbeitsort.region);
  }
  return parts.length > 0 ? parts.join(", ") : "Deutschland";
}

/**
 * Strip basic HTML tags from a string (descriptions may contain HTML).
 */
function stripHtml(html: string): string {
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

/**
 * Translate a single Arbeitsagentur job listing to a DiscoveredVacancy.
 * The search response does not include the full description, so we use the
 * `beruf` field (occupation / teaser) as a placeholder.
 */
function translateJob(job: ArbeitsagenturJob): DiscoveredVacancy {
  return {
    title: job.titel,
    employerName: job.arbeitgeber ?? "",
    location: buildLocationString(job.arbeitsort),
    description: job.beruf ? stripHtml(job.beruf) : "",
    sourceUrl: buildDetailUrl(job.hashId, job.refnr),
    sourceBoard: "arbeitsagentur",
    postedAt: job.aktuelleVeroeffentlichungsdatum
      ? new Date(job.aktuelleVeroeffentlichungsdatum)
      : undefined,
    employmentType: mapEmploymentType(job.arbeitszeit),
    externalId: job.refnr,
  };
}

/**
 * Translate a detail response into a DiscoveredVacancy with full description.
 */
function translateDetail(detail: ArbeitsagenturJobDetail): DiscoveredVacancy {
  return {
    title: detail.titel,
    employerName: detail.arbeitgeber ?? "",
    location: buildLocationString(detail.arbeitsort),
    description: detail.stellenbeschreibung
      ? stripHtml(detail.stellenbeschreibung)
      : detail.beruf
        ? stripHtml(detail.beruf)
        : "",
    sourceUrl: buildDetailUrl(detail.hashId, detail.refnr),
    sourceBoard: "arbeitsagentur",
    postedAt: detail.aktuelleVeroeffentlichungsdatum
      ? new Date(detail.aktuelleVeroeffentlichungsdatum)
      : undefined,
    employmentType: mapEmploymentType(detail.arbeitszeit),
    externalId: detail.refnr,
    salary: detail.verguetung ?? undefined,
    applicationInstructions: detail.bewerbung
      ? stripHtml(detail.bewerbung)
      : undefined,
  };
}

/**
 * Build the search query string from SearchParams.
 *
 * Connector-specific params (passed via `connectorParams`):
 *   - umkreis:           Radius in km (default: none)
 *   - veroeffentlichtseit: Days since published (e.g. 7, 14, 30)
 *   - arbeitszeit:       "vz" | "tz" (fulltime/parttime filter)
 *   - befristung:        1 (fixed-term) | 2 (permanent)
 */
function buildSearchParams(
  params: SearchParams,
  page: number,
): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("was", params.keywords);
  if (params.location) sp.set("wo", params.location);
  sp.set("page", page.toString());
  sp.set("size", PAGE_SIZE.toString());

  const cp = params.connectorParams ?? {};
  if (cp.umkreis != null) sp.set("umkreis", String(cp.umkreis));
  if (cp.veroeffentlichtseit != null) sp.set("veroeffentlichtseit", String(cp.veroeffentlichtseit));
  if (cp.arbeitszeit != null) sp.set("arbeitszeit", String(cp.arbeitszeit));
  if (cp.befristung != null) sp.set("befristung", String(cp.befristung));

  return sp;
}

export function createArbeitsagenturConnector(): DataSourceConnector {
  return {
    id: "arbeitsagentur",
    name: "Arbeitsagentur",
    requiresApiKey: false,

    async search(
      params: SearchParams,
    ): Promise<ConnectorResult<DiscoveredVacancy[]>> {
      try {
        const allVacancies: DiscoveredVacancy[] = [];
        let page = 0; // Arbeitsagentur API uses 0-based page index

        while (true) {
          const searchParams = buildSearchParams(params, page);
          const url = `${SEARCH_URL}?${searchParams.toString()}`;

          const data = await resilientFetch<ArbeitsagenturSearchResponse>(
            url,
            {
              method: "GET",
              headers: {
                "X-API-Key": API_KEY,
                Accept: "application/json",
              },
            },
          );

          const jobs = data.stellenangebote ?? [];
          if (jobs.length === 0) break;

          for (const job of jobs) {
            allVacancies.push(translateJob(job));
          }

          // Stop if we have collected all available results or hit the page end
          if (allVacancies.length >= data.maxErgebnisse) break;
          if (jobs.length < PAGE_SIZE) break;

          page++;
        }

        return { success: true, data: allVacancies };
      } catch (error) {
        if (error instanceof ArbeitsagenturApiError) {
          if (error.status === 429) {
            return {
              success: false,
              error: { type: "rate_limited" as const, retryAfter: 60 },
            };
          }
          return {
            success: false,
            error: {
              type: "network" as const,
              message: `Arbeitsagentur API error: ${error.status} ${error.message}`,
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
        const url = `${DETAIL_URL}/${encodeURIComponent(externalId)}`;
        const detail = await resilientFetch<ArbeitsagenturJobDetail>(url, {
          method: "GET",
          headers: {
            "X-API-Key": API_KEY,
            Accept: "application/json",
          },
        });

        return { success: true, data: translateDetail(detail) };
      } catch (error) {
        if (error instanceof ArbeitsagenturApiError) {
          if (error.status === 429) {
            return {
              success: false,
              error: { type: "rate_limited" as const, retryAfter: 60 },
            };
          }
          return {
            success: false,
            error: {
              type: "network" as const,
              message: `Arbeitsagentur API error: ${error.status} ${error.message}`,
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
