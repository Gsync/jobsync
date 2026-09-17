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

// Idempotent: creates SCHOOL + JOB workspaces (with default stages) only if missing,
// then assigns any workspace-less applications to the JOB workspace so the
// switcher always changes what the Jobs list shows.
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
    const all = [...existing, ...created];
    const jobWs = all.find((w) => w.type === "JOB");
    let backfilled = 0;
    if (jobWs) {
      const r = await prisma.job.updateMany({
        where: { userId: user.id, workspaceId: null },
        data: { workspaceId: jobWs.id },
      });
      backfilled = r.count;
    }
    return { data: all, backfilled, success: true };
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

export const setJobWorkspace = async (jobId: string, workspaceId: string | null) => {
  try {
    const user = await requireUser();
    if (workspaceId) {
      const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, userId: user.id } });
      if (!ws) throw new Error("Workspace not found.");
    }
    const job = await prisma.job.update({
      where: { id: jobId, userId: user.id },
      data: { workspaceId },
    });
    return { data: job, success: true };
  } catch (error) {
    return handleError(error, "Failed to move application. ");
  }
};

export const getWorkspaceCounts = async () => {
  try {
    const user = await requireUser();
    const groups = await prisma.job.groupBy({
      by: ["workspaceId"],
      where: { userId: user.id },
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const g of groups) {
      if (g.workspaceId) counts[g.workspaceId] = g._count.id;
    }
    return counts;
  } catch {
    return {} as Record<string, number>;
  }
};
