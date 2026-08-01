import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-key-resolver";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const baseURL = await resolveApiKey(userId, "openai-compatible");
    if (!baseURL) {
      return NextResponse.json(
        { error: "OpenAI-compatible base URL not configured" },
        { status: 500 },
      );
    }

    const apiKey = await resolveApiKey(userId, "openai-compatible-key");
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const cleanUrl = baseURL.replace(/\/+$/, "");
    const response = await fetch(`${cleanUrl}/v1/models`, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch models: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching OpenAI-compatible models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models from OpenAI-compatible endpoint" },
      { status: 502 },
    );
  }
}
