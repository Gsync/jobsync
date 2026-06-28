import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";
import { runAutomation, type RunnerResult } from "@/lib/scraper";
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
  req: NextRequest,
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

    const result: RunnerResult = await runAutomation({
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
    });

    return NextResponse.json({
      success: true,
      run: {
        id: result.runId,
        status: result.status,
        jobsSearched: result.jobsSearched,
        jobsDeduplicated: result.jobsDeduplicated,
        jobsProcessed: result.jobsProcessed,
        jobsMatched: result.jobsMatched,
        jobsSaved: result.jobsSaved,
        errorMessage: result.errorMessage,
        blockedReason: result.blockedReason,
      },
    });
  } catch (error) {
    console.error("Manual run error:", error);
    const message = error instanceof Error ? error.message : "Run failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
