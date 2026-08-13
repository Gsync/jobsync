import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { materializeCurrentEvaluations, claimEvaluations, type Evaluator } from "@/lib/jobEvaluations/service";
import { boundedJson, stringField, workerAuth } from "@/lib/jobEvaluations/http";

function evaluatorFrom(value: unknown): Evaluator | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const evaluatorKey = stringField(body.evaluatorKey, 100);
  const evaluatorVersion = stringField(body.evaluatorVersion, 100);
  if (!evaluatorKey || !evaluatorVersion || body.evaluatorDefinition === undefined || JSON.stringify(body.evaluatorDefinition).length > 32_000) return null;
  return { evaluatorKey, evaluatorVersion, evaluatorDefinition: body.evaluatorDefinition };
}

export async function POST(request: Request) {
  const auth = await workerAuth(request);
  if ("error" in auth) return auth.error;
  const parsed = await boundedJson(request);
  if ("error" in parsed) return parsed.error;
  const body = parsed.value as Record<string, unknown>;
  const evaluator = evaluatorFrom(body);
  const batch = typeof body.batch === "number" ? body.batch : NaN;
  const leaseSeconds = typeof body.leaseSeconds === "number" ? body.leaseSeconds : NaN;
  if (!evaluator || !Number.isInteger(batch) || batch < 1 || batch > 10 || !Number.isInteger(leaseSeconds) || leaseSeconds < 15 || leaseSeconds > 3600) {
    return NextResponse.json({ error: "Invalid claim request" }, { status: 400 });
  }
  const rows = await claimEvaluations(auth.userId, evaluator, batch, leaseSeconds * 1000);
  return NextResponse.json({ evaluations: rows.map((row) => ({ id: row.id, inputHash: row.inputHash, leaseToken: row.leaseToken, leaseExpiresAt: row.leaseExpiresAt, input: JSON.parse(row.inputSnapshot) })) });
}

export async function GET(request: Request) {
  const auth = await workerAuth(request);
  if ("error" in auth) return auth.error;
  const searchParams = new URL(request.url).searchParams;
  const evaluatorKey = searchParams.get("evaluatorKey");
  const evaluatorVersion = searchParams.get("evaluatorVersion");
  const definition = searchParams.get("definition");
  if (!evaluatorKey || !evaluatorVersion || !definition) return NextResponse.json({ error: "evaluatorKey, evaluatorVersion, and definition are required" }, { status: 400 });
  let evaluatorDefinition: unknown;
  try { evaluatorDefinition = JSON.parse(definition); } catch { return NextResponse.json({ error: "Invalid definition" }, { status: 400 }); }
  await materializeCurrentEvaluations(auth.userId, { evaluatorKey, evaluatorVersion, evaluatorDefinition });
  const jobId = new URL(request.url).searchParams.get("jobId");
  const rows = await prisma.jobEvaluation.findMany({ where: { userId: auth.userId, evaluatorKey, evaluatorVersion, ...(jobId ? { jobId } : {}) }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ evaluations: rows.filter((row) => row.isCurrent), history: rows.filter((row) => !row.isCurrent).map((row) => ({ id: row.id, jobId: row.jobId, status: row.status, evaluatedAt: row.evaluatedAt })) });
}
