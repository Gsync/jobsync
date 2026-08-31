import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { buildBackupZip } from "@/lib/backup/export";
import { log } from "@/lib/telemetry";

// A route handler rather than a server action: server actions cannot return a
// binary stream. Covered by the /api/* middleware matcher; auth() here is
// defense in depth.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { buffer, fileName } = await buildBackupZip(
      session.user.id,
      session.user.email ?? "",
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    log.error("[Backup] Export failed", { error: String(error) });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
