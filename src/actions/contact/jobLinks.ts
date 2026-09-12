"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";

const JOB_CONTACT_INCLUDE = {
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
};

export const getJobContacts = async (
  jobId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    return await prisma.jobContact.findMany({
      where: { jobId, Job: { userId: user.id } },
      include: JOB_CONTACT_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch job contacts. ");
  }
};

export const addJobContact = async (
  jobId: string,
  contactId: string,
  roleId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // JobContact has no userId. All three sides are checked, not just the job:
    // linking someone else's contact to your own job must fail.
    const [job, contact, role] = await Promise.all([
      prisma.job.count({ where: { id: jobId, userId: user.id } }),
      prisma.contact.count({ where: { id: contactId, createdBy: user.id } }),
      prisma.contactRole.count({ where: { id: roleId, createdBy: user.id } }),
    ]);
    if (job === 0) throw new Error("Job not found");
    if (contact === 0) throw new Error("Contact not found");
    if (role === 0) throw new Error("Role not found");

    const data = await prisma.jobContact.create({
      data: { jobId, contactId, roleId },
      include: JOB_CONTACT_INCLUDE,
    });
    return { success: true, data };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        success: false,
        message: "That contact already holds this role on this job.",
      };
    }
    return handleError(error, "Failed to link contact to job.");
  }
};

export const removeJobContact = async (
  linkId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const res = await prisma.jobContact.deleteMany({
      where: {
        id: linkId,
        Job: { userId: user.id },
        Contact: { createdBy: user.id },
      },
    });
    if (res.count === 0) throw new Error("Link not found");
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to unlink contact.");
  }
};
