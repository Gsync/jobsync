import { textToHtml } from "@/lib/scraper/html";

/** Keeps the form's location required while still accepting remote postings. */
export function fallbackImportedLocation(
  location: string,
  workplaceType?: string,
): string {
  if (location.trim()) return location.trim();
  return workplaceType === "Remote" ? "Remote" : "Not specified";
}

/** The description is required by the form; "N/A" matches its default. */
export function importedDescriptionHtml(
  descriptionHtml?: string,
  descriptionText?: string,
): string {
  if (descriptionHtml?.trim()) return descriptionHtml;
  if (descriptionText?.trim()) return textToHtml(descriptionText);
  return "<p>N/A</p>";
}
