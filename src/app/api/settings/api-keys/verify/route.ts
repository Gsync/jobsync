import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { provider, key } = await req.json();

  if (!provider || !key) {
    return NextResponse.json(
      { success: false, error: "Provider and key are required" },
      { status: 400 },
    );
  }

  try {
    switch (provider) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: res.status === 401 ? "Invalid API key" : `OpenAI returned ${res.status}`,
          });
        }
        return NextResponse.json({ success: true });
      }

      case "deepseek": {
        const res = await fetch("https://api.deepseek.com/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: res.status === 401 ? "Invalid API key" : `DeepSeek returned ${res.status}`,
          });
        }
        return NextResponse.json({ success: true });
      }

      case "rapidapi": {
        const res = await fetch(
          "https://jsearch.p.rapidapi.com/search?query=test&num_pages=1",
          {
            headers: {
              "X-RapidAPI-Key": key,
              "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
          },
        );
        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: res.status === 403 ? "Invalid API key" : `RapidAPI returned ${res.status}`,
          });
        }
        return NextResponse.json({ success: true });
      }

      case "ollama": {
        const baseUrl = key.replace(/\/+$/, "");
        const res = await fetch(`${baseUrl}/api/tags`);
        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: `Cannot connect to Ollama at ${baseUrl}`,
          });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown provider" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({
      success: false,
      error: message.includes("fetch failed") || message.includes("ECONNREFUSED")
        ? `Cannot connect to ${provider} service`
        : message,
    });
  }
}
