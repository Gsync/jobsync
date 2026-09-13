"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "../shared";
import { getReferenceEntityList } from "../referenceList";
import { CONTACT_LIST_INCLUDE } from "../contact/shared";
import { hideUnanalyzedScore } from "../job/shared";

export const getCompanyList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string,
  search?: string,
  scope: "mine" | "watchlist" = "mine",
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const watchlist = scope === "watchlist";

    return await getReferenceEntityList({
      model: prisma.company,
      userId: user.id,
      fkField: "companyId",
      appliedRelation: "jobsApplied",
      extraSelect: {
        logoUrl: true,
        watched: true,
        watchedAt: true,
        atsProvider: true,
        atsToken: true,
        atsHost: true,
      },
      extraCounts: [
        { key: "jobsRejected", where: { Status: { value: "rejected" } } },
      ],
      relationCounts: [
        { key: "contacts", relation: "contacts", where: { createdBy: user.id } },
      ],
      // A watched row sits at applied-count 0, so the default sort would bury
      // whatever was just watched; most-recent-first is what the scope is for.
      ...(watchlist
        ? {
            extraWhere: { watched: true },
            orderBy: [{ watchedAt: "desc" }, { label: "asc" }],
          }
        : {}),
      searchFields: ["label", "atsToken"],
      page,
      limit,
      countBy,
      search,
    });
  } catch (error) {
    const msg = "Failed to fetch company list. ";
    return handleError(error, msg);
  }
};

export const getAllCompanies = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const companies = await prisma.company.findMany({
      where: {
        createdBy: user.id,
      },
    });
    return companies;
  } catch (error) {
    const msg = "Failed to fetch all companies. ";
    return handleError(error, msg);
  }
};

export const getCompanyById = async (
  companyId: string,
): Promise<any | undefined> => {
  try {
    if (!companyId) {
      throw new Error("Please provide company id");
    }
    const user = await requireUser();

    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
        createdBy: user.id,
      },
    });
    return company;
  } catch (error) {
    const msg = "Failed to fetch company by Id. ";
    console.error(msg);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

const COMPANY_JOB_SELECT = {
  id: true,
  createdAt: true,
  applied: true,
  appliedDate: true,
  matchScore: true,
  matchData: true,
  JobTitle: { select: { label: true } },
  Status: { select: { label: true, value: true } },
  Location: { select: { label: true } },
  JobSource: { select: { label: true } },
};

// null covers both a missing id and another user's company, so the page's 404
// never reveals which. Dismissed jobs are hidden like on the Jobs page, but
// counted, because deleteCompanyById's job guard still sees them.
export const getCompanyDetails = async (
  companyId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const company = await prisma.company.findFirst({
      where: { id: companyId, createdBy: user.id },
    });
    if (!company) return null;

    const [jobs, dismissedJobsCount, currentContacts, formerContacts] =
      await Promise.all([
        prisma.job.findMany({
          where: {
            companyId,
            userId: user.id,
            OR: [
              { discoveryStatus: null },
              { discoveryStatus: { not: "dismissed" } },
            ],
          },
          select: COMPANY_JOB_SELECT,
          orderBy: { createdAt: "desc" },
        }),
        prisma.job.count({
          where: { companyId, userId: user.id, discoveryStatus: "dismissed" },
        }),
        prisma.contact.findMany({
          where: { companyId, createdBy: user.id },
          include: CONTACT_LIST_INCLUDE,
          orderBy: [{ name: "asc" }],
        }),
        prisma.contact.findMany({
          where: { workedAtCompanyId: companyId, createdBy: user.id },
          include: CONTACT_LIST_INCLUDE,
          orderBy: [{ name: "asc" }],
        }),
      ]);

    const visibleJobs = jobs.map(hideUnanalyzedScore);

    return {
      ...company,
      jobs: visibleJobs,
      appliedCount: visibleJobs.filter((job) => job.applied).length,
      dismissedJobsCount,
      currentContacts,
      formerContacts,
    };
  } catch (error) {
    return handleError(error, "Failed to fetch company details. ");
  }
};
