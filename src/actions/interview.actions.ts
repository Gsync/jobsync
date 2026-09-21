"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import { APP_CONSTANTS } from "@/lib/constants";
import { STAGE_DETAIL_INCLUDE } from "./jobStage/shared";
import type { InterviewView } from "@/models/interview.model";

// The same include the Timeline tab uses, so a row from this list is a
// complete JobStage and can be handed straight to AddStageDialog.
const INTERVIEW_LIST_INCLUDE = {
  ...STAGE_DETAIL_INCLUDE,
  Job: {
    select: {
      id: true,
      JobTitle: { select: { label: true } },
      Company: { select: { id: true, label: true } },
    },
  },
};

const buildInterviewWhere = (
  userId: string,
  view: InterviewView,
  now: Date,
  search?: string,
  stageTypeId?: string,
  companyId?: string,
) => {
  const where: any = {
    Job: { userId },
    StageType: { Status: { value: "interview" } },
  };

  if (view === "upcoming") {
    where.OR = [{ occurredAt: { gte: now } }, { occurredAt: null }];
  } else if (view === "past") {
    where.occurredAt = { lt: now };
  }

  // AND, because the upcoming window already owns the top-level OR.
  const and: any[] = [];
  if (stageTypeId) and.push({ stageTypeId });
  if (companyId) and.push({ Job: { companyId } });
  if (search) {
    and.push({
      OR: [
        { Job: { JobTitle: { label: { contains: search } } } },
        { Job: { Company: { label: { contains: search } } } },
        { StageType: { label: { contains: search } } },
        { interviewers: { some: { Contact: { name: { contains: search } } } } },
      ],
    });
  }
  if (and.length > 0) where.AND = and;

  return where;
};

// Ordering stays in the query because the list is server-paged. SQLite sorts
// NULL first on ASC, which is exactly the undated-first rule the Upcoming view
// wants, and the Past view's set holds no NULLs at all.
const interviewOrderBy = (view: InterviewView) =>
  view === "upcoming"
    ? [{ occurredAt: "asc" as const }, { createdAt: "asc" as const }]
    : [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }];

export const getInterviewList = async (
  view: InterviewView = "upcoming",
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  search?: string,
  stageTypeId?: string,
  companyId?: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const now = new Date();
    const where = buildInterviewWhere(
      user.id,
      view,
      now,
      search,
      stageTypeId,
      companyId,
    );

    // On DESC, SQLite sorts NULL last, which would bury every unscheduled
    // round on the final page. All pages dated rows and pins the rest to 1.
    const pinUndated = view === "all";
    const pagedWhere = pinUndated
      ? { ...where, occurredAt: { not: null } }
      : where;

    const [rows, total, pinned] = await Promise.all([
      prisma.jobStage.findMany({
        where: pagedWhere,
        skip: (page - 1) * limit,
        take: limit,
        include: INTERVIEW_LIST_INCLUDE,
        orderBy: interviewOrderBy(view),
      }),
      prisma.jobStage.count({ where }),
      pinUndated && page === 1
        ? prisma.jobStage.findMany({
            where: { ...where, occurredAt: null },
            include: INTERVIEW_LIST_INCLUDE,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    return { data: [...pinned, ...rows], total };
  } catch (error) {
    return handleError(error, "Failed to fetch interviews. ");
  }
};

// Options come from rows that exist, not from the Library: offering every
// stage type and every company would mostly offer empty results.
export const getInterviewFilterOptions = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const rows = await prisma.jobStage.findMany({
      where: {
        Job: { userId: user.id },
        StageType: { Status: { value: "interview" } },
      },
      select: {
        stageTypeId: true,
        StageType: { select: { label: true, sortOrder: true } },
        Job: { select: { companyId: true, Company: { select: { label: true } } } },
      },
    });

    const roundMap = new Map<string, { label: string; sortOrder: number }>();
    const companyMap = new Map<string, string>();
    for (const row of rows) {
      roundMap.set(row.stageTypeId, {
        label: row.StageType.label,
        sortOrder: row.StageType.sortOrder,
      });
      companyMap.set(row.Job.companyId, row.Job.Company.label);
    }

    const rounds = [...roundMap.entries()]
      .sort(
        (a, b) =>
          a[1].sortOrder - b[1].sortOrder || a[1].label.localeCompare(b[1].label),
      )
      .map(([id, v]) => ({ id, label: v.label }));

    const companies = [...companyMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ id, label }));

    return { rounds, companies };
  } catch (error) {
    return handleError(error, "Failed to fetch interview filters. ");
  }
};
