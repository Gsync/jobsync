"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { followUpDueDate } from "@/lib/outreach/follow-up";

export const logOutreach = async (input: {
  jobId?: string;
  contactId?: string;
  subject?: string;
  body?: string;
  paperCited?: string;
  sentAt?: Date;
}) => {
  try {
    const user = await requireUser();
    if (!input.jobId && !input.contactId) throw new Error("Link the outreach to an application or a contact.");
    if (input.jobId) {
      const own = await prisma.job.count({ where: { id: input.jobId, userId: user.id } });
      if (!own) throw new Error("Application not found.");
    }
    const sentAt = input.sentAt ?? new Date();
    const row = await prisma.outreach.create({
      data: {
        jobId: input.jobId,
        contactId: input.contactId,
        subject: input.subject,
        body: input.body,
        paperCited: input.paperCited,
        sentAt,
        followUpDue: followUpDueDate(sentAt),
      },
    });
    return { data: row, success: true };
  } catch (error) {
    return handleError(error, "Failed to log outreach. ");
  }
};

export const getFollowUpsDue = async (now = new Date()) => {
  try {
    const user = await requireUser();
    return await prisma.outreach.findMany({
      where: {
        repliedAt: null,
        followUpDue: { lte: now },
        job: { userId: user.id },
      },
      include: { job: { select: { id: true, description: true } }, contact: true },
      orderBy: { followUpDue: "asc" },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch follow-ups. ");
  }
};

export const markOutreachReplied = async (outreachId: string, outcome = "positive") => {
  try {
    await requireUser();
    const row = await prisma.outreach.update({
      where: { id: outreachId },
      data: { repliedAt: new Date(), outcome },
    });
    return { data: row, success: true };
  } catch (error) {
    return handleError(error, "Failed to update outreach. ");
  }
};

export const getOutreachList = async () => {
  try {
    const user = await requireUser();
    return await prisma.outreach.findMany({
      where: { OR: [{ job: { userId: user.id } }, { contact: { createdBy: user.id } }] },
      include: {
        job: { select: { id: true, JobTitle: { select: { label: true } } } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch outreach. ");
  }
};

export const getJobOptions = async () => {
  try {
    const user = await requireUser();
    return await prisma.job.findMany({
      where: { userId: user.id },
      select: { id: true, JobTitle: { select: { label: true } }, Company: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch applications. ");
  }
};

export const getContactOptions = async () => {
  try {
    const user = await requireUser();
    return await prisma.contact.findMany({
      where: { createdBy: user.id },
      select: { id: true, name: true, relationship: true },
      orderBy: { name: "asc" },
      take: 200,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch contacts. ");
  }
};

// Next N application deadlines (job dueDate + outreach follow-ups), merged.
export const getUpcomingDeadlines = async (limit = 10, now = new Date()) => {
  try {
    const user = await requireUser();
    const [jobs, outreach] = await Promise.all([
      prisma.job.findMany({
        where: { userId: user.id, dueDate: { gte: now } },
        select: {
          id: true,
          dueDate: true,
          JobTitle: { select: { label: true } },
          Company: { select: { label: true } },
        },
        orderBy: { dueDate: "asc" },
        take: limit,
      }),
      prisma.outreach.findMany({
        where: { repliedAt: null, followUpDue: { gte: now }, job: { userId: user.id } },
        select: {
          id: true,
          followUpDue: true,
          contact: { select: { name: true } },
        },
        orderBy: { followUpDue: "asc" },
        take: limit,
      }),
    ]);
    const items = [
      ...jobs.map((j) => ({
        kind: "deadline" as const,
        date: j.dueDate as Date,
        label: `${j.JobTitle?.label ?? "Application"} — ${j.Company?.label ?? ""}`,
        refId: j.id,
      })),
      ...outreach.map((o) => ({
        kind: "follow-up" as const,
        date: o.followUpDue as Date,
        label: `Follow up — ${o.contact?.name ?? "contact"}`,
        refId: o.id,
      })),
    ]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, limit);
    return items;
  } catch (error) {
    return handleError(error, "Failed to fetch deadlines. ");
  }
};
