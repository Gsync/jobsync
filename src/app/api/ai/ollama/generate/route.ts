import { auth } from "@/auth";
import { getOllamaBaseUrl } from "@/actions/apiKey.actions";
import { NextResponse } from "next/server";
import { APP_CONSTANTS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const baseUrl = await getOllamaBaseUrl();
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_GENERATE_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to generate" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying Ollama generate:", error);
    return NextResponse.json(
      { error: "Cannot connect to Ollama service" },
      { status: 502 },
    );
  }
}
