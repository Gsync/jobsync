import { ensureUniqueTitle } from "@/lib/resumeCopyTitle";

const MAX_TITLE_LENGTH = 100;

// Reuses the resume-copy uniquifier: the " (2)" / " (3)" convention and the
// 100-char fit are identical for both document types.
export const buildCoverLetterTitle = (
  jobTitle: string,
  companyName: string,
  takenTitles: string[],
): string => {
  const title = jobTitle.trim();
  const company = companyName.trim();
  // Trim the job title rather than the whole string so the company survives.
  const room = MAX_TITLE_LENGTH - (company ? company.length + 3 : 0);
  const base = company
    ? `${title.slice(0, Math.max(room, 0)).trimEnd()} - ${company}`
    : title.slice(0, MAX_TITLE_LENGTH);
  return ensureUniqueTitle(base, takenTitles);
};
