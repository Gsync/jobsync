import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { BackupError, importBackup, readSnapshot } from "@/lib/backup";
import { log } from "@/lib/telemetry";

// A rollback is an import whose bytes come off local disk instead of an
// upload, so it inherits every guard importBackup already has — including
// writing its own snapshot first, which is what makes a rollback undoable.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { snapshotId } = (await req.json()) as { snapshotId?: unknown };
    if (typeof snapshotId !== "string") {
      return NextResponse.json({ error: "No snapshot selected" }, { status: 400 });
    }

    // readSnapshot validates the id against an anchored pattern before it
    // touches the filesystem; the per-user directory is the second layer.
    const bytes = await readSnapshot(session.user.id, snapshotId);
    const result = await importBackup(
      bytes,
      session.user.id,
      session.user.email ?? "",
      true,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BackupError) {
      return NextResponse.json({ error: error.userMessage }, { status: 400 });
    }
    log.error("[Backup] Rollback failed", { error: String(error) });
    return NextResponse.json({ error: "Rollback failed." }, { status: 500 });
  }
}
