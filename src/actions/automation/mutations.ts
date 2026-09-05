"use server";

import db from "@/lib/db";
import { requireUser } from "../shared";
import { calculateNextRunAt } from "@/lib/scraper/schedule";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "@/models/automation.schema";
import type { AutomationWithResume } from "@/models/automation.model";
import { isRetiredBoard } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { syncSchedulerState } from "@/lib/scheduler";
import { formatError } from "./shared";

export async function createAutomation(input: CreateAutomationInput): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const validated = CreateAutomationSchema.parse(input);

    const count = await db.automation.count({ where: { userId: user.id } });
    if (count >= APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER) {
      return {
        success: false,
        message: `Maximum of ${APP_CONSTANTS.MAX_AUTOMATIONS_PER_USER} automations allowed per user`,
      };
    }

    const scheduleClash = await db.automation.findFirst({
      where: { userId: user.id, scheduleHour: validated.scheduleHour },
      select: { id: true },
    });
    if (scheduleClash) {
      return {
        success: false,
        message: `Another automation already runs at ${validated.scheduleHour
          .toString()
          .padStart(2, "0")}:00. Please choose a different time.`,
      };
    }

    const resume = await db.resume.findFirst({
      where: {
        id: validated.resumeId,
        profile: { userId: user.id },
      },
    });

    if (!resume) {
      return {
        success: false,
        message: "Resume not found or doesn't belong to you",
      };
    }

    const nextRunAt = calculateNextRunAt(validated.scheduleHour);

    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name: validated.name,
        jobBoard: validated.jobBoard,
        keywords: validated.keywords ?? "",
        location: validated.location ?? "",
        sourceConfig: validated.sourceConfig
          ? JSON.stringify(validated.sourceConfig)
          : null,
        resumeId: validated.resumeId,
        matchThreshold: validated.matchThreshold,
        scheduleHour: validated.scheduleHour,
        nextRunAt,
        status: "active",
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to create automation");
  }
}

export async function updateAutomation(
  id: string,
  input: UpdateAutomationInput,
): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const validated = UpdateAutomationSchema.parse(input);

    const existing = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, message: "Automation not found" };
    }

    if (isRetiredBoard(existing.jobBoard)) {
      return {
        success: false,
        message: `The ${existing.jobBoard} job board has been removed. This automation can only be deleted.`,
      };
    }

    if (validated.resumeId) {
      const resume = await db.resume.findFirst({
        where: {
          id: validated.resumeId,
          profile: { userId: user.id },
        },
      });
      if (!resume) {
        return {
          success: false,
          message: "Resume not found or doesn't belong to you",
        };
      }
    }

    const updateData: Record<string, unknown> = { ...validated };

    // sourceConfig is a parsed object in the validated input; the column is a
    // JSON string. Coalesce the legacy columns for greenhouse automations.
    if (validated.sourceConfig !== undefined) {
      updateData.sourceConfig = JSON.stringify(validated.sourceConfig);
    }
    if (validated.jobBoard) {
      updateData.keywords = validated.keywords ?? "";
      updateData.location = validated.location ?? "";
    }

    if (validated.scheduleHour !== undefined) {
      const scheduleClash = await db.automation.findFirst({
        where: {
          userId: user.id,
          scheduleHour: validated.scheduleHour,
          id: { not: id },
        },
        select: { id: true },
      });
      if (scheduleClash) {
        return {
          success: false,
          message: `Another automation already runs at ${validated.scheduleHour
            .toString()
            .padStart(2, "0")}:00. Please choose a different time.`,
        };
      }
      updateData.nextRunAt = calculateNextRunAt(validated.scheduleHour);
    }

    const automation = await db.automation.update({
      where: { id },
      data: updateData,
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      success: true,
      data: automation as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to update automation");
  }
}

export async function deleteAutomation(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    await db.automation.delete({ where: { id } });

    await syncSchedulerState();

    return { success: true };
  } catch (error) {
    return formatError(error, "Failed to delete automation");
  }
}

export async function pauseAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "paused",
        nextRunAt: null,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to pause automation");
  }
}

export async function resumeAutomation(id: string): Promise<{
  success: boolean;
  data?: AutomationWithResume;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id, userId: user.id },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const nextRunAt = calculateNextRunAt(automation.scheduleHour);

    const updated = await db.automation.update({
      where: { id },
      data: {
        status: "active",
        nextRunAt,
      },
      include: {
        resume: {
          select: { id: true, title: true },
        },
      },
    });

    await syncSchedulerState();

    return {
      success: true,
      data: updated as unknown as AutomationWithResume,
    };
  } catch (error) {
    return formatError(error, "Failed to resume automation");
  }
}
