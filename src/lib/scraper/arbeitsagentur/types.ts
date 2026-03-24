/**
 * TypeScript types for the Arbeitsagentur Jobsuche API v4 response.
 *
 * Reference: https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs
 */

/** Top-level search response envelope. */
export interface ArbeitsagenturSearchResponse {
  stellenangebote: ArbeitsagenturJob[];
  maxErgebnisse: number;
  page: number;
  size: number;
}

/** A single job listing returned by the search endpoint. */
export interface ArbeitsagenturJob {
  /** Reference number — unique identifier for the job posting. */
  refnr: string;
  /** Hash ID used for constructing the public detail URL. */
  hashId: string;
  /** Job title. */
  titel: string;
  /** Employer name. */
  arbeitgeber: string;
  /** Workplace location details. */
  arbeitsort: ArbeitsagenturArbeitsort;
  /** Employment type code: "vz" (full-time), "tz" (part-time), "snw" (shift/weekend), "mj" (mini-job), "ho" (home office). */
  arbeitszeit?: string;
  /** Contract type: 1 = fixed-term, 2 = permanent. */
  befristung?: number;
  /** ISO 8601 date string of publication. */
  aktuelleVeroeffentlichungsdatum: string;
  /** ISO 8601 date string when the listing was last modified. */
  modifikationsTimestamp?: string;
  /** Brief description or teaser text (HTML possible). */
  beruf?: string;
  /** External application URL if provided by the employer. */
  externeUrl?: string;
  /** Logo URL of the employer. */
  logoHashId?: string;
  /** Whether the position is flagged as an apprenticeship. */
  ausbildung?: boolean;
}

/** Location details within a job listing. */
export interface ArbeitsagenturArbeitsort {
  /** City name. */
  ort?: string;
  /** Region or state (Bundesland). */
  region?: string;
  /** Postal code. */
  plz?: string;
  /** Country. */
  land?: string;
  /** Latitude. */
  lat?: number;
  /** Lon (longitude). */
  lon?: number;
}

/** Detail response for a single job (GET /pc/v4/jobdetails/{refnr}). */
export interface ArbeitsagenturJobDetail {
  refnr: string;
  hashId: string;
  titel: string;
  arbeitgeber: string;
  arbeitsort: ArbeitsagenturArbeitsort;
  arbeitszeit?: string;
  befristung?: number;
  aktuelleVeroeffentlichungsdatum: string;
  stellenbeschreibung?: string;
  beruf?: string;
  externeUrl?: string;
  /** Application deadline (ISO 8601). */
  eintrittsdatum?: string;
  /** Salary / compensation description. */
  verguetung?: string;
  /** Free-text application instructions. */
  bewerbung?: string;
}
