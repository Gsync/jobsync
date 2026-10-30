import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { APP_CONSTANTS } from "@/lib/constants";
import { log } from "@/lib/telemetry";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = await resolveApiKey(session.user.id, "strata");
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Strata base URL not configured." },
        { status: 401 },
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/models`, {
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Strata models" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    log.warn("Strata models unreachable", {
      provider: "strata",
      error: String(error),
    });
    return NextResponse.json(
      { error: "Cannot connect to Strata service" },
      { status: 502 },
    );
  }
}
