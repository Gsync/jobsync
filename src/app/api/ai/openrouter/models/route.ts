import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-key-resolver";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const apiKey = await resolveApiKey(userId, "openrouter");

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured. Add your key in API Keys settings." },
        { status: 401 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OpenRouter models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return NextResponse.json(
      { error: "Failed to fetch OpenRouter models" },
      { status: 500 }
    );
  }
}
