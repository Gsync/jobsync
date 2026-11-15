import { resolveMcpToken } from "@/lib/mcp/auth";
import type { ApiV1ErrorResponse } from "@/models/apiV1.schema";

export type ApiV1Token = {
  userId: string;
  tokenName: string;
  scopes: string[];
  expiresAt: Date;
};

type ApiV1AuthResult =
  | { ok: true; token: ApiV1Token }
  | { ok: false; response: Response };

const REQUIRED_SCOPE = "jobs:write";

function errorResponse(error: string, status: number): Response {
  return Response.json({ error } satisfies ApiV1ErrorResponse, { status });
}

// Does not catch: a lookup failure propagates so the route returns its own 500.
export async function authenticateApiV1(req: Request): Promise<ApiV1AuthResult> {
  const auth = await resolveMcpToken(req);
  if (!auth.ok) {
    return { ok: false, response: errorResponse(auth.error, auth.status) };
  }
  if (!auth.scopes.includes(REQUIRED_SCOPE)) {
    return {
      ok: false,
      response: errorResponse(`Token is missing the ${REQUIRED_SCOPE} scope`, 403),
    };
  }
  const { userId, tokenName, scopes, expiresAt } = auth;
  return { ok: true, token: { userId, tokenName, scopes, expiresAt } };
}
