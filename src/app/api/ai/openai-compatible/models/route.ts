import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { fetchOpenaiCompatibleModels } from "@/lib/ai/provider-registry.server";
import { log } from "@/lib/telemetry";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = await resolveApiKey(session.user.id, "openai-compatible");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "No base URL is set for OpenAI-compatible. Add one under Settings → API Keys." },
      { status: 400 },
    );
  }

  try {
    const response = await fetchOpenaiCompatibleModels(baseUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch OpenAI-compatible models" }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    log.warn("OpenAI-compatible models unreachable", { provider: "openai-compatible", error: String(error) });
    return NextResponse.json({ error: "Cannot connect to the OpenAI-compatible server" }, { status: 503 });
  }
}
