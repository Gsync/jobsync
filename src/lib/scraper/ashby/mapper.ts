import type { JobDetails } from "../types";
import type { AshbyJob } from "./types";

// Ashby's workplaceType → WORKPLACE_TYPES enum key. "OnSite" has no hyphen
// here (Lever sends "on-site"), so the two adapters can't share one map.
function mapAshbyWorkplace(raw?: string): string | undefined {
  switch (raw?.toLowerCase()) {
    case "remote":
      return "REMOTE";
    case "hybrid":
      return "HYBRID";
    case "onsite":
      return "ONSITE";
    default:
      return undefined;
  }
}

export function mapAshbyJob(job: AshbyJob, companyName: string): JobDetails {
  // Join every office a posting is listed under so the strict-location gate
  // can match any of them, not just the primary.
  const locations = [
    job.location,
    ...(job.secondaryLocations ?? []).map((entry) => entry.location),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    title: (job.title ?? "").trim(),
    company: companyName, // not in the payload
    location: Array.from(new Set(locations)).join(", "),
    // descriptionHtml is already real HTML (no entity pass), matching what
    // Greenhouse stores post-decode, so the display path is unchanged.
    description:
      job.descriptionHtml?.trim() || job.descriptionPlain?.trim() || "",
    url: job.jobUrl,
    postedDate: job.publishedAt,
    employmentType: job.employmentType,
    // isRemote is deliberately unmapped: Ashby sets it true whenever a remote
    // office is offered, so hybrid/on-site roles carry it too.
    workplaceType: mapAshbyWorkplace(job.workplaceType),
  };
}
