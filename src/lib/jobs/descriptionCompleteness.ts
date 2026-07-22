import { APP_CONSTANTS } from "@/lib/constants";
import type { DescriptionCompleteness } from "@/models/job.model";

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Classified from the RAW submitted text, before markdown rendering, so
// stored HTML tags can never inflate the count.
export function classifyDescriptionCompleteness(
  description: string,
): DescriptionCompleteness {
  const words = countWords(description);
  if (words < APP_CONSTANTS.DESCRIPTION_PARTIAL_MIN_WORDS) return "title-only";
  if (words < APP_CONSTANTS.DESCRIPTION_FULL_MIN_WORDS) return "partial";
  return "full";
}
