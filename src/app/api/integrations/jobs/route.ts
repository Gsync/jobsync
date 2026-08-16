import { NextResponse } from "next/server";
import {
  getIntegrationResumeSnapshot,
  listIntegrationJobs,
  parseIntegrationJobsQuery,
} from "@/lib/jobs/integrationRead";
import { authorizeIntegrationRead } from "@/lib/jobs/integrationRoute";

export async function GET(req: Request) {
  const authorization = await authorizeIntegrationRead(req);
  if ("response" in authorization) return authorization.response;

  try {
    const { cursorId, limit } = parseIntegrationJobsQuery(req.url);
    const [page, defaultResume] = await Promise.all([
      listIntegrationJobs(authorization.userId, cursorId, limit),
      getIntegrationResumeSnapshot(authorization.userId, false),
    ]);
    return NextResponse.json({ defaultResume, ...page });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("limit") || error.message.startsWith("cursor"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to list integration jobs:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}
