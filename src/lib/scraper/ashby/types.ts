export interface AshbyJob {
  id: string;
  title?: string;
  department?: string;
  team?: string;
  employmentType?: string; // FullTime | PartTime | Intern | Contract | Temporary
  location?: string;
  // Extra offices a posting is listed under; each carries its own location.
  secondaryLocations?: { location?: string }[];
  publishedAt?: string; // ISO 8601
  isListed?: boolean;
  // Note: the payload also carries `isRemote`, deliberately omitted — it is
  // true on hybrid/on-site postings too. workplaceType is the remote signal.
  workplaceType?: string; // Remote | Hybrid | OnSite
  jobUrl: string;
  applyUrl?: string;
  descriptionHtml?: string; // already-decoded HTML, no entity pass needed
  descriptionPlain?: string;
}

export interface AshbyBoardResponse {
  jobs?: AshbyJob[];
  apiVersion?: string;
}

export interface AshbyCompany {
  name: string;
  token: string;
}
