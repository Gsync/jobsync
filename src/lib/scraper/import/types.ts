export type JobImportProvider =
  | "linkedin"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "generic";

export interface ImportedJobDetails {
  provider: JobImportProvider;
  /** Human-readable JobSource label, e.g. "LinkedIn" or "Greenhouse". */
  sourceLabel: string;
  /** The posting URL that was imported. */
  url: string;
  title: string;
  company: string;
  location: string;
  descriptionHtml: string;
  descriptionText: string;
  /** The posting's own label, e.g. "Full-time" or "FullTime". */
  employmentType?: string;
  /** Normalized to the labels used by WORKPLACE_TYPES. */
  workplaceType?: "Remote" | "Hybrid" | "Onsite";
  salary?: string;
  postedDate?: string;
}

/** A URL that resolved to a supported provider, plus the ids it carries. */
export interface DetectedJobUrl {
  provider: JobImportProvider;
  /** Board token for an ATS provider. */
  token?: string;
  /** Posting id for an ATS provider. */
  id?: string;
  /** Lever's EU posting host, which uses a different API base. */
  eu?: boolean;
}
