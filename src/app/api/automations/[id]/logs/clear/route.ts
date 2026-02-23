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
    where: {
      id: automationId,
      userId,
    },
  });

  if (!automation) {
    return NextResponse.json({ message: "Automation not found" }, { status: 404 });
  }

  automationLogger.clearLogs(automationId);

  return NextResponse.json({ success: true });
}
