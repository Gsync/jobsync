import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { APP_CONSTANTS } from "@/lib/constants";
import { BackupError, importBackup } from "@/lib/backup";
import { isOverUploadCap } from "@/lib/backup/upload";
import { log } from "@/lib/telemetry";

// The app's first destructive route handler. Route handlers get none of the
// Origin/Host checking Next.js applies to Server Actions; what stands in for it
// is Auth.js's explicit sameSite: "lax" session cookie, so a cross-site POST
// never carries a session. Anything that later weakens that cookie has to add
// an Origin check here.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (isOverUploadCap(req)) {
    return NextResponse.json(
      { error: "That file is larger than the backup size limit." },
      { status: 413 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const confirmWipe = formData.get("confirmWipe") === "true";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No backup file uploaded" }, { status: 400 });
    }
    if (file.size > APP_CONSTANTS.BACKUP_MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "That file is larger than the backup size limit." },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await importBackup(
      bytes,
      session.user.id,
      session.user.email ?? "",
      confirmWipe,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BackupError) {
      return NextResponse.json({ error: error.userMessage }, { status: 400 });
    }
    log.error("[Backup] Import failed", { error: String(error) });
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
