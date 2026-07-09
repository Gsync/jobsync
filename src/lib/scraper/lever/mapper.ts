import type { JobDetails } from "../types";
import type { LeverPosting } from "./types";
import { flattenHtml } from "../greenhouse";

// Lever's workplaceType string → WORKPLACE_TYPES enum key. Undefined for
// absent/unrecognized values (falls back to isRemote downstream in mapper.ts).
function mapLeverWorkplace(raw?: string): string | undefined {
  switch (raw?.toLowerCase()) {
    case "remote":
      return "REMOTE";
    case "hybrid":
      return "HYBRID";
    case "on-site":
    case "onsite":
      return "ONSITE";
    default:
      return undefined;
  }
}

export function mapLeverJob(job: LeverPosting, companyName: string): JobDetails {
  // descriptionPlain is a superset of openingPlain (Lever repeats the opening
  // inside it), so prefer it and only fall back to openingPlain when empty —
  // concatenating both duplicates the intro. The `lists` sections carry the
  // responsibilities/requirements as HTML and appear in none of the plain
  // fields, so flatten and append them, then the closing (additionalPlain).
  const intro = job.descriptionPlain?.trim() || job.openingPlain?.trim() || "";

  const listSections = (job.lists ?? []).map((section) =>
    [section.text?.trim(), flattenHtml(section.content ?? "")]
      .filter(Boolean)
      .join("\n"),
  );

  const description = [intro, ...listSections, job.additionalPlain?.trim()]
    .filter(Boolean)
    .join("\n\n");

  // Join all offices a posting is listed under so the strict-location gate can
  // match against any of them, not just the first.
  const locations = job.categories?.allLocations?.length
    ? job.categories.allLocations
    : job.categories?.location
      ? [job.categories.location]
      : [];

  return {
    title: (job.text ?? "").trim(),
    company: companyName, // not in payload
    location: locations.join(", "),
    description,
    url: job.hostedUrl,
    postedDate: job.createdAt
      ? new Date(job.createdAt).toISOString()
      : undefined,
    employmentType: job.categories?.commitment,
    workplaceType: mapLeverWorkplace(job.workplaceType),
  };
}
