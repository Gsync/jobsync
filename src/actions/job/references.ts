"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { JOB_STATUSES } from "@/lib/constants";
import { requireUser } from "../shared";

// JobStatus is global reference data with no createdBy column, so unlike every
// other list here it is not scoped to the current user. Sorted in JS because
// rows are in insertion order, and migrations insert some before signup.
const STATUS_ORDER = new Map<string, number>(
  JOB_STATUSES.map((s, i) => [s.value, i]),
);

export const getStatusList = async (): Promise<any | undefined> => {
  try {
    const statuses = await prisma.jobStatus.findMany();
    const rank = (value: string) =>
      STATUS_ORDER.get(value) ?? JOB_STATUSES.length;
    return statuses.sort((a, b) => rank(a.value) - rank(b.value));
  } catch (error) {
    const msg = "Failed to fetch status list. ";
    return handleError(error, msg);
  }
};

export const getJobSourceList = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const list = await prisma.jobSource.findMany({
      where: {
        createdBy: user.id,
      },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

export const createLocation = async (
  label: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = canonicalizeEntityValue(label.trim());

    if (!value) {
      throw new Error("Please provide location name");
    }

    const existing = await prisma.location.findFirst({
      where: { value, createdBy: user.id },
    });
    if (existing) {
      return { data: existing, success: true };
    }

    const location = await prisma.location.create({
      data: { label, value, createdBy: user.id },
    });

    return { data: location, success: true };
  } catch (error) {
    const msg = "Failed to create job location. ";
    return handleError(error, msg);
  }
};

export const createJobSource = async (
  label: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const value = canonicalizeEntityValue(label.trim());

    if (!value) {
      throw new Error("Please provide job source name");
    }

    const existing = await prisma.jobSource.findFirst({
      where: { value, createdBy: user.id },
    });
    if (existing) {
      return { data: existing, success: true };
    }

    const jobSource = await prisma.jobSource.create({
      data: { label, value, createdBy: user.id },
    });

    return { data: jobSource, success: true };
  } catch (error) {
    const msg = "Failed to create job source. ";
    return handleError(error, msg);
  }
};
