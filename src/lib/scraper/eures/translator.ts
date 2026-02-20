import type { DiscoveredVacancy } from "../types";
import type { components } from "./generated";

type EuresJobVacancy = components["schemas"]["JobVacancy"];

const EURES_VACANCY_URL_BASE = "https://europa.eu/eures/portal/jv-se/jv-details/";

export function translateEuresVacancy(
  jv: EuresJobVacancy,
  requestLanguage: string,
): DiscoveredVacancy {
  const translation = jv.translations[requestLanguage];
  const title = translation?.title ?? jv.title;
  const description = stripHtml(translation?.description ?? jv.description);

  return {
    title,
    employerName: jv.employer.name,
    location: formatLocation(jv.locationMap),
    description,
    sourceUrl: `${EURES_VACANCY_URL_BASE}${jv.id}`,
    sourceBoard: "eures",
    postedAt: jv.creationDate ? new Date(jv.creationDate) : undefined,
    salary: undefined,
    employmentType: mapScheduleCode(jv.positionScheduleCodes),
    externalId: jv.id,
  };
}

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

function formatLocation(locationMap: Record<string, string[]>): string {
  const entries = Object.entries(locationMap);
  if (entries.length === 0) return "Europe";

  return entries
    .map(([country, cities]) => {
      const city = cities.find((c) => c.length > 0);
      return city ? `${city}, ${country}` : country;
    })
    .join("; ");
}

function mapScheduleCode(codes: string[]): "full_time" | "part_time" | "contract" | undefined {
  if (!codes || codes.length === 0) return undefined;

  const code = codes[0];
  switch (code) {
    case "fulltime":
      return "full_time";
    case "parttime":
      return "part_time";
    case "flextime":
      return "part_time";
    default:
      return undefined;
  }
}
