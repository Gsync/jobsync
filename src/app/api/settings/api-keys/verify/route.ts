import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";

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

  const verifier = PROVIDER_VERIFIERS[provider];
  if (!verifier) {
    return NextResponse.json(
      { success: false, error: "Unknown provider" },
      { status: 400 },
    );
  }

  try {
    const result = await verifier(key);
    return NextResponse.json(result);
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
