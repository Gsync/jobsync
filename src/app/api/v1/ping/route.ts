import { authenticateApiV1 } from "@/lib/apiV1/auth";
import { log } from "@/lib/telemetry";
import type { ApiV1ErrorResponse, ApiV1PingResponse } from "@/models/apiV1.schema";
import packageJson from "../../../../../package.json";

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await authenticateApiV1(req);
    if (!auth.ok) return auth.response;

    const { tokenName, expiresAt, scopes } = auth.token;
    return Response.json({
      app: "jobsync",
      version: packageJson.version,
      tokenName,
      tokenExpiresAt: expiresAt.toISOString(),
      scopes,
    } satisfies ApiV1PingResponse);
  } catch (error) {
    log.error("[API v1] ping failed", { error: String(error) });
    return Response.json(
      { error: "Connection test failed" } satisfies ApiV1ErrorResponse,
      { status: 500 },
    );
  }
}
