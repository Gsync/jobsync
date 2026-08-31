import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { listSnapshots } from "@/lib/backup";
import { log } from "@/lib/telemetry";

// The user id comes from the session and is the only thing that selects the
// directory — there is no client-supplied path anywhere in this handler.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    return NextResponse.json(await listSnapshots(session.user.id), { status: 200 });
  } catch (error) {
    log.error("[Backup] Listing snapshots failed", { error: String(error) });
    return NextResponse.json({ error: "Could not list snapshots." }, { status: 500 });
  }
}
