import { NextResponse } from "next/server";
import { failEvaluation } from "@/lib/jobEvaluations/service";
import { boundedJson, stringField, workerAuth } from "@/lib/jobEvaluations/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await workerAuth(request);
  if ("error" in auth) return auth.error;
  const parsed = await boundedJson(request, 8_000);
  if ("error" in parsed) return parsed.error;
  const body = parsed.value as Record<string, unknown>;
  const leaseToken = stringField(body.leaseToken, 200);
  const inputHash = stringField(body.inputHash, 128);
  const error = stringField(body.error, 2_000);
  if (!leaseToken || !inputHash || !error) return NextResponse.json({ error: "Invalid failure" }, { status: 400 });
  const outcome = await failEvaluation(auth.userId, (await params).id, leaseToken, inputHash, error);
  return outcome === "retry" || outcome === "failed" || outcome === "idempotent" ? NextResponse.json({ status: outcome }) : NextResponse.json({ error: "Stale or conflicting failure" }, { status: 409 });
}
