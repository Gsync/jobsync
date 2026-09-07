"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import type { JobBoard, LeverHost } from "@/models/automation.model";
import type { Company } from "@/models/job.model";
import { requireUser } from "../shared";

export type WatchBoardResult =
  | { success: true; data: { companyId: string; merged: boolean } }
  | {
      success: false;
      needsConfirm: true;
      existing: { id: string; label: string };
    }
  | { success: false; message: string };

export type WatchedBoard = {
  id: string;
  name: string;
  token: string;
  host?: LeverHost;
  provider: JobBoard;
};

const WATCHED_BOARD_SELECT = {
  id: true,
  label: true,
  atsToken: true,
  atsHost: true,
  atsProvider: true,
} as const;

// Watches a board from the seed directory. Makes no network call: the name,
// token and host all arrive from JSON the browse view already loaded.
export const watchBoardCompany = async (
  provider: JobBoard,
  board: { name: string; token: string; host?: LeverHost },
  opts?: { confirmMerge?: boolean },
): Promise<WatchBoardResult> => {
  try {
    const user = await requireUser();

    const value = canonicalizeEntityValue(board.name.trim(), {
      stripLegalSuffix: true,
    });
    const atsHost = provider === "lever" ? (board.host ?? "default") : null;
    const coords = {
      atsProvider: provider,
      atsToken: board.token,
      atsHost,
    };

    const markWatched = async (id: string, withCoords: boolean) => {
      await prisma.company.update({
        where: { id, createdBy: user.id },
        data: {
          watched: true,
          watchedAt: new Date(),
          ...(withCoords ? coords : {}),
        },
      });
    };

    const byToken = await prisma.company.findFirst({
      where: {
        createdBy: user.id,
        atsProvider: provider,
        atsToken: board.token,
      },
    });
    if (byToken) {
      await markWatched(byToken.id, false);
      return { success: true, data: { companyId: byToken.id, merged: false } };
    }

    const byValue = await prisma.company.findFirst({
      where: { value, createdBy: user.id },
    });

    if (byValue) {
      if (byValue.atsToken) {
        return {
          success: false,
          message: `${byValue.label} is already linked to its ${byValue.atsProvider} board. A company can hold one board.`,
        };
      }
      if (!opts?.confirmMerge) {
        return {
          success: false,
          needsConfirm: true,
          existing: { id: byValue.id, label: byValue.label },
        };
      }
      await markWatched(byValue.id, true);
      return { success: true, data: { companyId: byValue.id, merged: true } };
    }

    try {
      const created = await prisma.company.create({
        data: {
          createdBy: user.id,
          value,
          label: board.name,
          watched: true,
          watchedAt: new Date(),
          ...coords,
        },
      });
      return { success: true, data: { companyId: created.id, merged: false } };
    } catch (error) {
      // Steps above are check-then-act, so a second tab can reach this create
      // after winning the race. Re-run both lookups rather than reading
      // error.meta.target, whose shape differs between SQLite and Postgres.
      if ((error as { code?: string }).code !== "P2002") throw error;

      const raced = await prisma.company.findFirst({
        where: {
          createdBy: user.id,
          atsProvider: provider,
          atsToken: board.token,
        },
      });
      if (raced) {
        await markWatched(raced.id, false);
        return { success: true, data: { companyId: raced.id, merged: false } };
      }

      const namesake = await prisma.company.findFirst({
        where: { value, createdBy: user.id },
      });
      if (namesake && !namesake.atsToken) {
        if (!opts?.confirmMerge) {
          return {
            success: false,
            needsConfirm: true,
            existing: { id: namesake.id, label: namesake.label },
          };
        }
        await markWatched(namesake.id, true);
        return {
          success: true,
          data: { companyId: namesake.id, merged: true },
        };
      }
      throw error;
    }
  } catch (error) {
    const msg = "Failed to watch company.";
    return handleError(error, msg) as WatchBoardResult;
  }
};

// Toggles watch intent only. Board coordinates stay true after unwatching, so
// re-watching is one click; removing the row entirely is deleteCompanyById.
export const setCompanyWatched = async (
  companyId: string,
  watched: boolean,
): Promise<{ success: boolean; message?: string; data?: Company }> => {
  try {
    const user = await requireUser();

    const res = await prisma.company.update({
      where: { id: companyId, createdBy: user.id },
      data: { watched, watchedAt: watched ? new Date() : null },
    });
    return { success: true, data: res as unknown as Company };
  } catch (error) {
    const msg = "Failed to update watch status.";
    return handleError(error, msg);
  }
};

export const getWatchedBoards = async (
  provider?: JobBoard,
): Promise<WatchedBoard[]> => {
  try {
    const user = await requireUser();

    const rows = await prisma.company.findMany({
      where: {
        createdBy: user.id,
        watched: true,
        atsToken: { not: null },
        ...(provider ? { atsProvider: provider } : {}),
      },
      select: WATCHED_BOARD_SELECT,
      orderBy: { label: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.label,
      token: row.atsToken as string,
      provider: row.atsProvider as JobBoard,
      ...(row.atsHost ? { host: row.atsHost as LeverHost } : {}),
    }));
  } catch {
    return [];
  }
};
