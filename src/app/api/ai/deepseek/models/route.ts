import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-key-resolver";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const apiKey = await resolveApiKey(userId, "deepseek");

    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.deepseek.com/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch DeepSeek models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching DeepSeek models:", error);
    return NextResponse.json(
      { error: "Failed to fetch DeepSeek models" },
      { status: 500 }
    );
  }
}
