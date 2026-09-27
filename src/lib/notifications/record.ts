import "server-only";
import db from "@/lib/db";
import { log } from "@/lib/telemetry";
import { ATS_PROVIDERS } from "@/lib/scraper/ats/registry";
import type { FinalizeData } from "@/lib/scraper/automation-run/finalize";
import type { BoardFailure } from "@/lib/scraper/automation-run/types";
import type { JobBoard } from "@/models/automation.model";
import type {
  BoardFailurePayload,
  BoardPayload,
  ErrorPayload,
  RunPayload,
} from "@/models/notification.model";
import { classifyBoardError, describeRunFailure } from "./boardError";

function toBoardPayload(b: BoardFailure): BoardFailurePayload {
  return {
    token: b.token,
    companyName: b.name,
    code: classifyBoardError(b.reason),
    reason: b.reason,
  };
}

// Called by finalizeRun before the run row turns terminal, so anything that
// watches the run status sees the notifications too. Never throws.
export async function recordRunNotifications(
  runId: string,
  data: FinalizeData,
): Promise<void> {
  if (data.status === "cancelled") return;
  try {
    const run = await db.automationRun.findUnique({
      where: { id: runId },
      select: {
        automationId: true,
        automation: { select: { userId: true, jobBoard: true } },
      },
    });
    if (!run) return;

    const base = {
      userId: run.automation.userId,
      automationId: run.automationId,
      runId,
    };
    const boards = data.boardErrors ?? [];

    if (data.status === "completed" || data.status === "completed_with_errors") {
      // Only an AI outage earns a red row; board failures get their own rows.
      const aiError = data.aiError ?? null;
      const payload: RunPayload = {
        status: data.status,
        jobsSearched: data.jobsSearched,
        jobsSaved: data.jobsSaved,
        belowThreshold: Math.max(0, data.jobsProcessed - data.jobsMatched),
        boardsFailed: boards.length,
        aiError,
      };
      await db.notification.create({
        data: { ...base, kind: "run", payload: JSON.stringify(payload) },
      });
      if (aiError) {
        const err: ErrorPayload = {
          reason: aiError,
          jobsSaved: data.jobsSaved,
          boards: [],
        };
        await db.notification.create({
          data: { ...base, kind: "error", payload: JSON.stringify(err) },
        });
      }
      const provider =
        ATS_PROVIDERS[run.automation.jobBoard as JobBoard]?.label ??
        run.automation.jobBoard;
      for (const board of boards) {
        await upsertBoardRow(base, provider, board);
      }
      return;
    }

    // failed / blocked / rate_limited: one red row; an all-boards failure
    // lists the boards inside it instead of one row each (D3).
    const err: ErrorPayload = {
      reason: describeRunFailure(
        data.errorMessage ?? null,
        data.blockedReason ?? null,
      ),
      jobsSaved: data.jobsSaved,
      boards: boards.map(toBoardPayload),
    };
    await db.notification.create({
      data: { ...base, kind: "error", payload: JSON.stringify(err) },
    });
  } catch (error) {
    log.error("[Notifications] Failed to record run notifications", {
      "run.id": runId,
      error: String(error),
    });
  }
}

async function upsertBoardRow(
  base: { userId: string; automationId: string; runId: string },
  provider: string,
  board: BoardFailure,
): Promise<void> {
  const payload: BoardPayload = { provider, ...toBoardPayload(board) };
  const existing = await db.notification.findFirst({
    where: {
      userId: base.userId,
      automationId: base.automationId,
      kind: "board",
      boardToken: board.token,
    },
    select: { id: true },
  });
  if (existing) {
    // D2: resurface — unread and back in the popover even if dismissed.
    await db.notification.update({
      where: { id: existing.id },
      data: {
        runId: base.runId,
        payload: JSON.stringify(payload),
        occurrences: { increment: 1 },
        occurredAt: new Date(),
        readAt: null,
        dismissedAt: null,
      },
    });
    return;
  }
  await db.notification.create({
    data: {
      ...base,
      kind: "board",
      boardToken: board.token,
      payload: JSON.stringify(payload),
    },
  });
}
