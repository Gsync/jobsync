"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "../shared";
import { defaultStagesFor } from "@/lib/workspaces/defaults";
import type { WorkspaceType } from "@prisma/client";

export const getWorkspaces = async () => {
  try {
    const user = await requireUser();
    return await prisma.workspace.findMany({
      where: { userId: user.id },
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch workspaces. ");
  }
};

export const createWorkspace = async (name: string, type: WorkspaceType) => {
  try {
    const user = await requireUser();
    if (!name.trim()) throw new Error("Workspace name cannot be empty.");
    if (type !== "SCHOOL" && type !== "JOB") throw new Error("Unknown workspace type.");
    const ws = await prisma.workspace.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type,
        stages: { create: defaultStagesFor(type) },
      },
      include: { stages: true },
    });
    return { data: ws, success: true };
  } catch (error) {
    return handleError(error, "Failed to create workspace. ");
  }
};

// Idempotent: creates SCHOOL + JOB workspaces (with default stages) only if missing.
export const ensureDefaultWorkspaces = async () => {
  try {
    const user = await requireUser();
    const existing = await prisma.workspace.findMany({ where: { userId: user.id } });
    const types = new Set(existing.map((w) => w.type));
    const created = [];
    for (const [type, name] of [["SCHOOL", "School"], ["JOB", "Jobs"]] as const) {
      if (types.has(type)) continue;
      created.push(
        await prisma.workspace.create({
          data: { userId: user.id, name, type, stages: { create: defaultStagesFor(type) } },
        })
      );
    }
    return { data: [...existing, ...created], success: true };
  } catch (error) {
    return handleError(error, "Failed to ensure workspaces. ");
  }
};

export const deleteWorkspaceById = async (workspaceId: string) => {
  try {
    const user = await requireUser();
    const linked = await prisma.job.count({ where: { workspaceId, User: { id: user.id } } });
    if (linked > 0) throw new Error(`Workspace still has ${linked} application(s) linked.`);
    const res = await prisma.workspace.delete({ where: { id: workspaceId, userId: user.id } });
    return { res, success: true };
  } catch (error) {
    return handleError(error, "Failed to delete workspace. ");
  }
};
