"use server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { requireUser } from "@/actions/shared";

export const ACTIVE_WORKSPACE_COOKIE = "activeWorkspaceId";

export async function getActiveWorkspaceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceId(id: string) {
  const user = await requireUser();
  const ws = await prisma.workspace.findFirst({ where: { id, userId: user.id } });
  if (!ws) throw new Error("Workspace not found.");
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { success: true };
}

export async function getActiveWorkspace() {
  const user = await requireUser();
  const activeId = await getActiveWorkspaceId();
  const list = await prisma.workspace.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const active = list.find((w) => w.id === activeId) ?? list[0] ?? null;
  return { workspaces: list, active };
}
