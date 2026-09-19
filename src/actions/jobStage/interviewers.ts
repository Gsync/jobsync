"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { resolveContactRole } from "@/lib/jobs/resolve";
import { assertInterviewStage, assertStageOwned } from "./shared";

const INTERVIEWER_ROLE_LABEL = "Interviewer";

const INTERVIEWER_INCLUDE = {
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
};

export const linkStageInterviewer = async (
  stageId: string,
  contactId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // Two sides, checked independently: JobStageInterviewer has no owner
    // column, so owning the stage is not permission to attach this contact.
    const [stage, contact] = await Promise.all([
      assertStageOwned(stageId, user.id),
      prisma.contact.count({ where: { id: contactId, createdBy: user.id } }),
    ]);
    if (contact === 0) throw new Error("Contact not found");
    assertInterviewStage(stage);

    const data = await prisma.jobStageInterviewer.create({
      data: { stageId, contactId },
      include: INTERVIEWER_INCLUDE,
    });

    // The job's Contacts tab stays the single roster of everyone involved.
    // Resolve-or-create: the seeded role is renameable and deletable.
    const role = await resolveContactRole(INTERVIEWER_ROLE_LABEL, user.id);
    const existing = await prisma.jobContact.findFirst({
      where: { jobId: stage.jobId, contactId, roleId: role.id },
      select: { id: true },
    });
    if (!existing) {
      await prisma.jobContact.create({
        data: { jobId: stage.jobId, contactId, roleId: role.id },
      });
    }

    return { success: true, data };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        success: false,
        message: "That contact is already an interviewer on this stage.",
      };
    }
    return handleError(error, "Failed to link interviewer.");
  }
};

export const unlinkStageInterviewer = async (
  linkId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    // The JobContact is deliberately left in place: the person may hold other
    // roles on this job, and unlinking a stage is not unlinking the job.
    const res = await prisma.jobStageInterviewer.deleteMany({
      where: {
        id: linkId,
        Stage: { Job: { userId: user.id } },
        Contact: { createdBy: user.id },
      },
    });
    if (res.count === 0) throw new Error("Interviewer link not found");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to unlink interviewer.");
  }
};
