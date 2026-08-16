import { NextResponse } from "next/server";
import {
  getIntegrationResumeSnapshot,
  getOwnedIntegrationJob,
} from "@/lib/jobs/integrationRead";
import { authorizeIntegrationRead } from "@/lib/jobs/integrationRoute";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeIntegrationRead(req);
  if ("response" in authorization) return authorization.response;

  try {
    const { id } = await params;
    const job = await getOwnedIntegrationJob(authorization.userId, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const defaultResume = await getIntegrationResumeSnapshot(authorization.userId, true);
    return NextResponse.json({ job, defaultResume });
  } catch (error) {
    console.error("Failed to read integration job:", error);
    return NextResponse.json({ error: "Failed to read job" }, { status: 500 });
  }
}
