import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";
import { automationLogger } from "@/lib/automation-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const { id: automationId } = await params;

  const automation = await db.automation.findFirst({
    where: { id: automationId, userId },
  });

  if (!automation) {
    return NextResponse.json({ message: "Automation not found" }, { status: 404 });
  }

  // In-memory flag (fast path, same process only).
  automationLogger.requestCancel(automationId);

  // DB-backed cancel signal. This is the reliable channel: the runner polls the
  // run row, so cancellation works even when /cancel and /run are served from
  // different module instances or processes (where the in-memory flag is not
  // shared). The runner finalizes the run to "cancelled".
  const flagged = await db.automationRun.updateMany({
    where: { automationId, status: "running" },
    data: { status: "cancelling" },
  });

  const wasRunning = flagged.count > 0 || automationLogger.isRunning(automationId);
  if (wasRunning) {
    automationLogger.log(automationId, "warning", "Cancellation requested by user");
  }

  return NextResponse.json({ success: true, cancelled: wasRunning });
}
