import { NextResponse } from "next/server";
import { hasMcpScope, resolveMcpToken } from "@/lib/mcp/auth";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export async function authorizeIntegrationRead(req: Request) {
  const auth = await resolveMcpToken(req);
  if (!auth.ok) {
    return {
      response: NextResponse.json({ error: auth.error }, { status: auth.status }),
    } as const;
  }
  if (!hasMcpScope(auth.scopes, "jobs:read")) {
    return {
      response: NextResponse.json(
        { error: "Insufficient scope. Required: jobs:read" },
        { status: 403 },
      ),
    } as const;
  }

  const rateLimit = checkMcpRateLimit(auth.userId);
  if (!rateLimit.allowed) {
    return {
      response: NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) },
        },
      ),
    } as const;
  }

  return { userId: auth.userId } as const;
}
