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
