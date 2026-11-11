// Normalized shapes returned by the public LinkedIn guest endpoints. These
// are deliberately independent of the ATS `JobDetails` type: LinkedIn's
// public HTML is an undocumented surface, so the parser keeps the raw
// description HTML as well as a plain-text form for callers that store text.

export interface LinkedInJobDetails {
  /** Numeric LinkedIn posting id. */
  id: string;
  /** Canonical public URL, without tracking/regional host differences. */
  url: string;
  title: string;
  company: string;
  location: string;
  descriptionHtml: string;
  descriptionText: string;
  /** LinkedIn's own label, e.g. "Full-time", "Contract". */
  employmentType?: string;
  /** Normalized to the labels used by WORKPLACE_TYPES. */
  workplaceType?: "Remote" | "Hybrid" | "Onsite";
  postedDate?: string;
  salary?: string;
}

export interface LinkedInSearchResult {
  id: string;
  url: string;
  title: string;
  company: string;
  location: string;
  postedDate?: string;
}

export interface LinkedInSearchPage {
  results: LinkedInSearchResult[];
  /** Offset for the next page, or null when this was the last page. */
  nextStart: number | null;
}
