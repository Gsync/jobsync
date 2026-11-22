import { authenticateApiV1 } from "@/lib/apiV1/auth";
import {
  createJobFromNames,
  type CreateJobFromNamesResult,
} from "@/lib/jobs/createJobFromNames";
import { JobResolutionError } from "@/lib/jobs/resolve";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { log } from "@/lib/telemetry";
import {
  ApiV1AddJobSchema,
  type ApiV1AddJobCreated,
  type ApiV1AddJobDuplicate,
  type ApiV1ErrorResponse,
  type ApiV1Issue,
  type ApiV1RateLimited,
  type ApiV1ValidationError,
} from "@/models/apiV1.schema";

const jobPath = (id: string) => `/dashboard/myjobs/${id}`;

function invalid(issues: ApiV1Issue[]): Response {
  return Response.json(
    { error: "Invalid request", issues } satisfies ApiV1ValidationError,
    { status: 400 },
  );
}

function rateLimited(resetIn: number): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil(resetIn / 1000));
  return Response.json(
    { error: "Rate limit exceeded", retryAfterSeconds } satisfies ApiV1RateLimited,
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

// Built field by field: the result's message and resolutions are MCP prose.
function resultResponse(result: CreateJobFromNamesResult): Response {
  if (result.created) {
    const body: ApiV1AddJobCreated = {
      created: true,
      jobId: result.jobId!,
      jobPath: jobPath(result.jobId!),
      descriptionCompleteness: result.descriptionCompleteness!,
    };
    return Response.json(body, { status: 201 });
  }
  const { id, title, company } = result.duplicateOf!;
  const body: ApiV1AddJobDuplicate = {
    created: false,
    duplicateOf: { id, title, company },
    jobPath: jobPath(id),
  };
  return Response.json(body, { status: 409 });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await authenticateApiV1(req);
    if (!auth.ok) return auth.response;
    const { userId, tokenName } = auth.token;

    const limit = checkMcpRateLimit(userId);
    if (!limit.allowed) return rateLimited(limit.resetIn);

    const json = await readJson(req);
    if (!json.ok) return invalid([{ path: "", message: "Body must be valid JSON" }]);

    const parsed = ApiV1AddJobSchema.safeParse(json.body);
    if (!parsed.success) {
      return invalid(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    const { via, ...fields } = parsed.data;
    const result = await createJobFromNames(
      { ...fields, createdVia: via ?? tokenName },
      userId,
    );
    return resultResponse(result);
  } catch (error) {
    if (error instanceof JobResolutionError) {
      return invalid([{ path: "", message: error.message }]);
    }
    log.error("[API v1] add job failed", { error: String(error) });
    return Response.json(
      { error: "Failed to save job" } satisfies ApiV1ErrorResponse,
      { status: 500 },
    );
  }
}
