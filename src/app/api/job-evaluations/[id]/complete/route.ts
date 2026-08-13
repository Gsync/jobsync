import { NextResponse } from "next/server";
import { completeEvaluation } from "@/lib/jobEvaluations/service";
import { boundedJson, stringField, workerAuth } from "@/lib/jobEvaluations/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await workerAuth(request);
  if ("error" in auth) return auth.error;
  const parsed = await boundedJson(request);
  if ("error" in parsed) return parsed.error;
  const body = parsed.value as Record<string, unknown>;
  const leaseToken = stringField(body.leaseToken, 200);
  const inputHash = stringField(body.inputHash, 128);
  if (!leaseToken || !inputHash || !body.result || typeof body.result !== "object" || Array.isArray(body.result) || JSON.stringify(body.result).length > 96_000) return NextResponse.json({ error: "Invalid completion" }, { status: 400 });
  const outcome = await completeEvaluation(auth.userId, (await params).id, leaseToken, inputHash, body.result as Record<string, unknown>);
  return outcome === "completed" || outcome === "idempotent" ? NextResponse.json({ status: outcome }) : NextResponse.json({ error: "Stale or conflicting completion" }, { status: 409 });
}
