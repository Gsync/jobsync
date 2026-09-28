"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import {
  JOB_TYPES,
  JobFacets,
  JobListScope,
  JobSortField,
} from "@/models/job.model";
import { normalizeJobFacets } from "@/lib/jobs/jobFacets";
import type { SortState } from "@/models/sort.model";
import { findManySorted, planListSort, SortFieldSpec } from "@/lib/listSort";
import { APP_CONSTANTS } from "@/lib/constants";
import { requireUser } from "../shared";
import { hideUnanalyzedScore, UNANALYZED_MATCH_MARKER } from "./shared";
import { STAGE_DETAIL_INCLUDE } from "../jobStage/shared";

const JOB_LIST_SELECT = {
  id: true,
  createdAt: true,
  JobSource: true,
  JobTitle: true,
  jobType: true,
  workplaceType: true,
  salaryRange: true,
  Company: true,
  Status: true,
  Location: true,
  dueDate: true,
  appliedDate: true,
  description: false,
  Resume: true,
  CoverLetter: true,
  matchScore: true,
  matchData: true,
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
          lastContactedAt: true,
          Company: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  stages: { include: STAGE_DETAIL_INCLUDE },
};

type JobsListFilters = JobListScope & {
  facets?: JobFacets;
  search?: string;
};

const buildJobsWhereClause = (userId: string, filters: JobsListFilters) => {
  const {
    search,
    companyValue,
    appliedOnly,
    titleValue,
    locationValue,
    sourceValue,
  } = filters;
  const facets = normalizeJobFacets(filters.facets);
  const and: Record<string, any>[] = [];

  // Dismissed discovered jobs are kept only for dedup and shouldn't
  // clutter the tracked jobs list unless explicitly included.
  if (!facets.includeDismissed) {
    and.push({
      OR: [{ discoveryStatus: null }, { discoveryStatus: { not: "dismissed" } }],
    });
  }

  // Accepted (discovered) sits in the Status list, so it ORs with statuses.
  const statusOr: Record<string, any>[] = [];
  if (facets.statuses.length) {
    statusOr.push({ Status: { value: { in: facets.statuses } } });
  }
  if (facets.acceptedDiscovered) {
    statusOr.push({ discoveryStatus: "accepted" });
  }
  if (statusOr.length) and.push({ OR: statusOr });

  if (facets.jobTypes.length) {
    and.push({ jobType: { in: facets.jobTypes } });
  }
  if (facets.workplaces.length) {
    and.push({ workplaceType: { in: facets.workplaces } });
  }

  const whereClause: any = { userId, AND: and };

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

// Text sorts use the canonical lowercase `value`, so order ignores case.
const JOB_SORT_SPECS: Record<JobSortField, SortFieldSpec> = {
  appliedDate: {
    orderBy: (dir) => ({ appliedDate: dir }),
    blanks: {
      hasValue: { appliedDate: { not: null } },
      noValue: { appliedDate: null },
    },
  },
  title: { orderBy: (dir) => ({ JobTitle: { value: dir } }) },
  company: { orderBy: (dir) => ({ Company: { value: dir } }) },
  location: {
    orderBy: (dir) => ({ Location: { value: dir } }),
    blanks: {
      hasValue: { locationId: { not: null } },
      noValue: { locationId: null },
    },
  },
  source: {
    orderBy: (dir) => ({ JobSource: { value: dir } }),
    blanks: {
      hasValue: { jobSourceId: { not: null } },
      noValue: { jobSourceId: null },
    },
  },
  // A hidden pre-rank is not a score, so those jobs sort with the unmatched.
  // The matchData: null branch keeps a scored row with no matchData visible.
  matchScore: {
    orderBy: (dir) => ({ matchScore: dir }),
    blanks: {
      hasValue: {
        matchScore: { not: null },
        OR: [
          { matchData: null },
          { NOT: { matchData: { contains: UNANALYZED_MATCH_MARKER } } },
        ],
      },
      noValue: {
        OR: [
          { matchScore: null },
          { matchData: { contains: UNANALYZED_MATCH_MARKER } },
        ],
      },
    },
  },
};

export const getJobsList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  facets?: JobFacets,
  search?: string,
  companyValue?: string,
  appliedOnly?: boolean,
  titleValue?: string,
  locationValue?: string,
  sourceValue?: string,
  sort?: SortState,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const skip = (page - 1) * limit;

    const whereClause = buildJobsWhereClause(user.id, {
      facets,
      search,
      companyValue,
      appliedOnly,
      titleValue,
      locationValue,
      sourceValue,
    });

    const { data, total } = await findManySorted(
      prisma.job,
      { where: whereClause, skip, take: limit, select: JOB_LIST_SELECT },
      planListSort(sort, JOB_SORT_SPECS, [{ createdAt: "desc" }]),
    );
    return { success: true, data: data.map(hideUnanalyzedScore), total };
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    return handleError(error, msg);
  }
};

export const getJobFilterCounts = async (
  facets: JobFacets,
  search?: string,
  scope: JobListScope = {},
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const applied = normalizeJobFacets(facets);
    // Status counts ignore the Status section itself, so ticking one status
    // never zeroes the others.
    const statusFree = { ...applied, statuses: [], acceptedDiscovered: false };
    const where = buildJobsWhereClause(user.id, { ...scope, search, facets: applied });
    const statusFreeWhere = buildJobsWhereClause(user.id, {
      ...scope,
      search,
      facets: statusFree,
    });

    const [total, grouped, acceptedDiscovered] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.groupBy({
        by: ["statusId"],
        where: statusFreeWhere,
        _count: { _all: true },
      }),
      prisma.job.count({
        where: { AND: [statusFreeWhere, { discoveryStatus: "accepted" }] },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      grouped.map((row) => [row.statusId, row._count._all]),
    );
    return { success: true, data: { total, statusCounts, acceptedDiscovered } };
  } catch (error) {
    const msg = "Failed to count jobs. ";
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
