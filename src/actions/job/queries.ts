"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { JOB_TYPES } from "@/models/job.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "../shared";

const JOB_LIST_SELECT = {
  id: true,
  JobSource: true,
  JobTitle: true,
  jobType: true,
  workplaceType: true,
  Company: true,
  Status: true,
  Location: true,
  dueDate: true,
  appliedDate: true,
  description: false,
  Resume: true,
  CoverLetter: true,
  matchScore: true,
  discoveryStatus: true,
  _count: { select: { Notes: true } },
};

const JOB_EXPORT_SELECT = {
  id: true,
  createdAt: true,
  JobSource: true,
  JobTitle: true,
  jobType: true,
  workplaceType: true,
  Company: true,
  Status: true,
  Location: true,
  dueDate: true,
  applied: true,
  appliedDate: true,
};

const JOB_DETAILS_INCLUDE = {
  JobSource: true,
  JobTitle: true,
  Company: true,
  Status: true,
  Location: true,
  Resume: {
    include: {
      File: true,
    },
  },
  CoverLetter: true,
  tags: true,
  contactLinks: {
    include: {
      Role: true,
      Contact: {
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          Company: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

type JobsListFilters = {
  filter?: string;
  search?: string;
  companyValue?: string;
  appliedOnly?: boolean;
  titleValue?: string;
  locationValue?: string;
  sourceValue?: string;
};

const buildJobsWhereClause = (userId: string, filters: JobsListFilters) => {
  const {
    filter,
    search,
    companyValue,
    appliedOnly,
    titleValue,
    locationValue,
    sourceValue,
  } = filters;

  const filterBy = filter
    ? filter === Object.keys(JOB_TYPES)[1]
      ? {
          jobType: filter,
        }
      : filter === "accepted" || filter === "dismissed"
        ? {
            discoveryStatus: filter,
          }
        : {
            Status: {
              value: filter,
            },
          }
    : {};

  const whereClause: any = {
    userId,
    ...filterBy,
  };

  // Dismissed discovered jobs are kept only for dedup and shouldn't
  // clutter the tracked jobs list unless explicitly filtered for.
  if (filter !== "dismissed") {
    whereClause.AND = [
      {
        OR: [{ discoveryStatus: null }, { discoveryStatus: { not: "dismissed" } }],
      },
    ];
  }

  if (companyValue) {
    whereClause.Company = { value: companyValue };
  }

  if (titleValue) {
    whereClause.JobTitle = { value: titleValue };
  }

  if (locationValue) {
    whereClause.Location = { value: locationValue };
  }

  if (sourceValue) {
    whereClause.JobSource = { value: sourceValue };
  }

  if (appliedOnly) {
    whereClause.applied = true;
  }

  // An explicit facet filter already pins that field, so searching it too
  // would widen the result set back out via OR.
  if (search) {
    const searchConditions: Record<string, any>[] = [];
    if (!titleValue) {
      searchConditions.push({ JobTitle: { label: { contains: search } } });
    }
    if (!companyValue) {
      searchConditions.push({ Company: { label: { contains: search } } });
    }
    if (!locationValue) {
      searchConditions.push({ Location: { label: { contains: search } } });
    }
    if (!sourceValue) {
      searchConditions.push({ JobSource: { label: { contains: search } } });
    }
    searchConditions.push(
      { description: { contains: search } },
    );
    whereClause.OR = searchConditions;
  }

  return whereClause;
};

export const getJobsList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  filter?: string,
  search?: string,
  companyValue?: string,
  appliedOnly?: boolean,
  titleValue?: string,
  locationValue?: string,
  sourceValue?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;

    const whereClause = buildJobsWhereClause(user.id, {
      filter,
      search,
      companyValue,
      appliedOnly,
      titleValue,
      locationValue,
      sourceValue,
    });

    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: JOB_LIST_SELECT,
        orderBy: {
          createdAt: "desc",
          // appliedDate: "desc",
        },
      }),
      prisma.job.count({
        where: whereClause,
      }),
    ]);
    return { success: true, data, total };
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    return handleError(error, msg);
  }
};

export async function* getJobsIterator(filter?: string, pageSize = 200) {
  const user = await requireUser();
  let page = 1;
  let fetchedCount = 0;

  while (true) {
    const skip = (page - 1) * pageSize;
    const filterBy = filter
      ? filter === Object.keys(JOB_TYPES)[1]
        ? { status: filter }
        : { type: filter }
      : {};

    const chunk = await prisma.job.findMany({
      where: {
        userId: user.id,
        ...filterBy,
      },
      select: JOB_EXPORT_SELECT,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    if (!chunk.length) {
      break;
    }

    yield chunk;
    fetchedCount += chunk.length;
    page++;
  }
}

export const getJobDetails = async (
  jobId: string,
): Promise<any | undefined> => {
  try {
    if (!jobId) {
      throw new Error("Please provide job id");
    }
    const user = await requireUser();

    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
        userId: user.id,
      },
      include: JOB_DETAILS_INCLUDE,
    });
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to fetch job details. ";
    return handleError(error, msg);
  }
};
