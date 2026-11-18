"use server";

import { handleError } from "@/lib/utils";
import type { ScraperError } from "@/lib/scraper/types";
import { resolveJobFromUrl } from "@/lib/scraper/import";
import { normalizeEmploymentType } from "@/lib/scraper/import/normalize";
import {
  fallbackImportedLocation,
  importedDescriptionHtml,
} from "@/lib/jobs/importedJob";
import {
  resolveCompany,
  resolveJobSource,
  resolveJobTitle,
  resolveJobType,
  resolveLocation,
  resolveWorkplaceType,
} from "@/lib/jobs/resolve";
import { requireUser } from "./shared";

function importMessage(error: ScraperError): string {
  switch (error.type) {
    case "blocked":
      return error.reason;
    case "rate_limited":
      return "That job board is rate limiting JobSync. Try again in a few minutes.";
    case "network":
    case "parse":
      return error.message;
  }
}

/**
 * Resolves any job posting URL into the reference ids and values the Add Job
 * form stores. The form keeps ids rather than names, so resolving the entities
 * here avoids four extra round trips from the client.
 */
export const resolveJobUrlForForm = async (
  url: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const result = await resolveJobFromUrl(url);
    if (!result.success) {
      return { success: false, message: importMessage(result.error) };
    }

    const details = result.data;
    const location = fallbackImportedLocation(
      details.location,
      details.workplaceType,
    );

    const [company, title, resolvedLocation, source] = await Promise.all([
      resolveCompany(details.company, user.id),
      resolveJobTitle(details.title, user.id),
      resolveLocation(location, user.id),
      resolveJobSource(details.sourceLabel, user.id),
    ]);

    return {
      success: true,
      data: {
        provider: details.provider,
        jobUrl: details.url,
        titleId: title.id,
        titleLabel: title.label,
        companyId: company.id,
        companyLabel: company.label,
        locationId: resolvedLocation.id,
        locationLabel: resolvedLocation.label,
        sourceId: source.id,
        sourceLabel: source.label,
        jobType: resolveJobType(
          normalizeEmploymentType(details.employmentType),
        ),
        workplaceType: resolveWorkplaceType(details.workplaceType),
        salaryRange: details.salary ?? "",
        descriptionHtml: importedDescriptionHtml(
          details.descriptionHtml,
          details.descriptionText,
        ),
        descriptionText: details.descriptionText,
        postedDate: details.postedDate,
      },
    };
  } catch (error) {
    return handleError(error, "Failed to import job. ");
  }
};
