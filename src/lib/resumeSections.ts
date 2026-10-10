import { APP_CONSTANTS } from "@/lib/constants";

export const hasMinResumeSections = (
  sectionCount: number | null | undefined,
): boolean =>
  (sectionCount ?? 0) >= APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION;

export const buildInsufficientSectionsMessage = (
  action: string,
  hint?: string,
): string => {
  const min = APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION;
  return `Add at least ${min} sections${
    hint ? ` (${hint})` : ""
  } before ${action}.`;
};

export const buildIncompleteResumeHint = (): string =>
  `Add at least ${APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION} sections to use this resume when adding a job or in an automation. An attached file does not count.`;
