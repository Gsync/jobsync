import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";
import { runAutomation } from "@/lib/scraper";
import type { JobBoard } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";

const recentRuns = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRuns = recentRuns.get(userId) || [];

  const validRuns = userRuns.filter((timestamp) => now - timestamp < APP_CONSTANTS.AUTOMATION_RATE_LIMIT_WINDOW_MS);
  recentRuns.set(userId, validRuns);

  if (validRuns.length >= APP_CONSTANTS.AUTOMATION_MAX_MANUAL_RUNS_PER_HOUR) {
    return false;
  }

  validRuns.push(now);
  recentRuns.set(userId, validRuns);
  return true;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const { id: automationId } = await params;

  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { message: `Rate limit exceeded. Maximum ${APP_CONSTANTS.AUTOMATION_MAX_MANUAL_RUNS_PER_HOUR} manual runs per hour.` },
      { status: 429 }
    );
  }

  try {
    const automation = await db.automation.findFirst({
      where: {
        id: automationId,
        userId,
      },
      include: {
        resume: true,
      },
    });

    if (!automation) {
      return NextResponse.json({ message: "Automation not found" }, { status: 404 });
    }

    if (!automation.resume) {
      return NextResponse.json(
        { message: "Resume is missing. Please edit the automation and select a resume." },
        { status: 400 }
      );
    }

    // Single-flight per automation. The logger/cancel state is keyed by
    // automationId, so two overlapping runs of the same automation would clobber
    // each other's logs, complete prematurely, and cross-cancel.
    const activeRun = await db.automationRun.findFirst({
      where: { automationId, status: { in: ["running", "cancelling"] } },
      select: { id: true },
    });

    if (activeRun) {
      return NextResponse.json(
        { success: false, message: "A run is already in progress for this automation." },
        { status: 409 }
      );
    }

    // Fire-and-forget: run in the background and return immediately. Keeping the
    // request alive for the whole run blocked the dev server from servicing the
    // /cancel request concurrently (and req.signal disconnect was unreliable).
    // Cancellation now flows purely through the DB flag, which the runner polls.
    // The client watches progress/completion via the /logs SSE and run history.
    void runAutomation({
      id: automation.id,
      userId: automation.userId,
      name: automation.name,
      jobBoard: automation.jobBoard as JobBoard,
      keywords: automation.keywords,
      location: automation.location,
      sourceConfig: automation.sourceConfig,
      resumeId: automation.resumeId,
      matchThreshold: automation.matchThreshold,
      scheduleHour: automation.scheduleHour,
      nextRunAt: automation.nextRunAt,
      lastRunAt: automation.lastRunAt,
      status: automation.status as "active" | "paused",
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt,
    }).catch((err) => {
      console.error("Background automation run failed:", err);
    });

    return NextResponse.json({ success: true, started: true });
  } catch (error) {
    console.error("Manual run error:", error);
    const message = error instanceof Error ? error.message : "Run failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
