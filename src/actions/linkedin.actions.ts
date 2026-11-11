"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import type { ScraperError } from "@/lib/scraper/types";
import {
  fetchLinkedInJob,
  fetchLinkedInSearchResults,
} from "@/lib/scraper/linkedin";
import { parseLinkedInSearchUrl } from "@/lib/scraper/linkedin/url";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import {
  resolveCompany,
  resolveJobSource,
  resolveJobTitle,
  resolveJobType,
  resolveLocation,
  resolveWorkplaceType,
} from "@/lib/jobs/resolve";
import { requireUser } from "./shared";

const SaveSearchSchema = z.object({
  name: z.string().trim().max(80).optional(),
  url: z.string().trim().min(1, "Paste a LinkedIn jobs search URL."),
});

function scraperMessage(error: ScraperError): string {
  switch (error.type) {
    case "blocked":
      return error.reason;
    case "rate_limited":
      return "LinkedIn is rate limiting JobSync. Try again in a few minutes.";
    case "network":
    case "parse":
      return error.message;
  }
}

// LinkedIn's employment labels are broader than JobSync's three job types.
// Fold the extra categories into the closest stored value instead of failing
// the import on a label like "Temporary".
function normalizeEmploymentType(input?: string): string {
  const value = input?.toLowerCase() ?? "";
  if (value.includes("part")) return "Part-time";
  if (
    value.includes("contract") ||
    value.includes("temporary") ||
    value.includes("intern") ||
    value.includes("volunteer")
  ) {
    return "Contract";
  }
  return "Full-time";
}

function fallbackLocation(
  location: string,
  workplaceType?: string,
): string {
  if (location) return location;
  return workplaceType === "Remote" ? "Remote" : "Not specified";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const getLinkedInSearches = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const searches = await prisma.linkedInSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: searches };
  } catch (error) {
    return handleError(error, "Failed to load LinkedIn searches. ");
  }
};

export const createLinkedInSearch = async (data: {
  name?: string;
  url: string;
}): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const parsed = SaveSearchSchema.parse(data);
    const search = parseLinkedInSearchUrl(parsed.url);
    if (!search) {
      throw new Error(
        "Paste a LinkedIn jobs search URL, such as linkedin.com/jobs/search/?keywords=designer&location=Toronto.",
      );
    }

    const name =
      parsed.name?.trim() ||
      [search.keywords, search.location].filter(Boolean).join(" in ") ||
      "LinkedIn search";

    const saved = await prisma.linkedInSearch.upsert({
      where: { userId_url: { userId: user.id, url: search.url } },
      update: {
        name,
        keywords: search.keywords,
        location: search.location || null,
      },
      create: {
        userId: user.id,
        name,
        url: search.url,
        keywords: search.keywords,
        location: search.location || null,
      },
    });

    revalidatePath("/dashboard/linkedin");
    return { success: true, data: saved };
  } catch (error) {
    return handleError(error, "Failed to save LinkedIn search. ");
  }
};

export const deleteLinkedInSearch = async (
  id: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const result = await prisma.linkedInSearch.deleteMany({
      where: { id, userId: user.id },
    });
    if (result.count === 0) throw new Error("LinkedIn search not found.");
    revalidatePath("/dashboard/linkedin");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete LinkedIn search. ");
  }
};

export const getLinkedInSearchResults = async (
  id: string,
  start = 0,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const search = await prisma.linkedInSearch.findFirst({
      where: { id, userId: user.id },
    });
    if (!search) throw new Error("LinkedIn search not found.");

    const result = await fetchLinkedInSearchResults(search.url, start);
    if (!result.success) {
      return { success: false, message: scraperMessage(result.error) };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return handleError(error, "Failed to load LinkedIn results. ");
  }
};

/**
 * Fetches a LinkedIn posting and resolves/creates the reference rows the Add
 * Job form needs. The form stores ids, not names, so returning the ids here
 * avoids four extra round trips from the client.
 */
export const resolveLinkedInJobForForm = async (
  url: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const result = await fetchLinkedInJob(url);
    if (!result.success) {
      return { success: false, message: scraperMessage(result.error) };
    }

    const details = result.data;
    const [company, title, location, source] = await Promise.all([
      resolveCompany(details.company, user.id),
      resolveJobTitle(details.title, user.id),
      resolveLocation(
        fallbackLocation(details.location, details.workplaceType),
        user.id,
      ),
      resolveJobSource("LinkedIn", user.id),
    ]);

    const descriptionHtml =
      details.descriptionHtml ||
      `<p>${escapeHtml(details.descriptionText || "N/A")}</p>`;

    return {
      success: true,
      data: {
        jobId: details.id,
        jobUrl: details.url,
        titleId: title.id,
        titleLabel: title.label,
        companyId: company.id,
        companyLabel: company.label,
        locationId: location.id,
        locationLabel: location.label,
        sourceId: source.id,
        sourceLabel: source.label,
        jobType: resolveJobType(
          normalizeEmploymentType(details.employmentType),
        ),
        workplaceType: resolveWorkplaceType(details.workplaceType),
        salaryRange: details.salary ?? "",
        descriptionHtml,
        descriptionText: details.descriptionText,
        postedDate: details.postedDate,
      },
    };
  } catch (error) {
    return handleError(error, "Failed to import LinkedIn job. ");
  }
};

/**
 * One-click import from the LinkedIn searches page. Resolves or creates the
 * company/title/location/source and saves the posting as a New job.
 */
export const importLinkedInJob = async (
  url: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const result = await fetchLinkedInJob(url);
    if (!result.success) {
      return { success: false, message: scraperMessage(result.error) };
    }

    const details = result.data;
    const created = await createJobFromNames(
      {
        company: details.company,
        jobTitle: details.title,
        jobDescription: details.descriptionText || "N/A",
        location: fallbackLocation(details.location, details.workplaceType),
        source: "LinkedIn",
        jobType: normalizeEmploymentType(details.employmentType),
        workplaceType: details.workplaceType,
        status: "new",
        jobUrl: details.url,
        salaryRange: details.salary,
        createdVia: "linkedin",
      },
      user.id,
    );

    revalidatePath("/dashboard/myjobs");
    revalidatePath("/dashboard");
    return { success: true, data: created };
  } catch (error) {
    return handleError(error, "Failed to import LinkedIn job. ");
  }
};
