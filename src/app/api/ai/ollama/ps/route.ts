import { auth } from "@/auth";
import { getOllamaBaseUrl } from "@/actions/apiKey.actions";
import { NextResponse } from "next/server";
import { APP_CONSTANTS } from "@/lib/constants";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = await getOllamaBaseUrl();
    const response = await fetch(`${baseUrl}/api/ps`, {
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch running models" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying Ollama ps:", error);
    return NextResponse.json(
      { error: "Cannot connect to Ollama service" },
      { status: 502 },
    );
  }
}
