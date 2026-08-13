import { createHash, randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import prisma from "@/lib/db";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { removeHtmlTags, normalizeWhitespace } from "@/lib/ai/tools/text-processing";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";

export const FULL_DESCRIPTION_WORDS = 150;
export const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export type Evaluator = { evaluatorKey: string; evaluatorVersion: string; evaluatorDefinition: unknown };

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

export function isSubstantialDescription(description: string): boolean {
  return normalizeWhitespace(removeHtmlTags(description)).split(/\s+/).filter(Boolean).length >= FULL_DESCRIPTION_WORDS;
}

export async function withSqliteBusyRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === attempts - 1 || (code !== "P2034" && !/SQLITE_BUSY/i.test(message))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function canonicalInput(job: any, resume: any, evaluator: Evaluator) {
  const preprocessed = await preprocessResume(resume);
  if (!preprocessed.success) return null;
  const description = normalizeWhitespace(removeHtmlTags(job.description));
  if (!isSubstantialDescription(description)) return null;
  const jobInput = {
    title: job.JobTitle.label,
    company: job.Company.label,
    location: job.Location?.label ?? "",
    workplaceType: job.workplaceType ?? "",
    jobType: job.jobType,
    salaryRange: job.salaryRange ?? "",
    description,
  };
  const resumeInput = { id: resume.id, content: preprocessed.data.normalizedText };
  const definition = evaluator.evaluatorDefinition;
  const snapshot = { evaluator: { key: evaluator.evaluatorKey, version: evaluator.evaluatorVersion, definition }, job: jobInput, resume: resumeInput };
  return {
    jobHash: sha256(jobInput),
    resumeHash: sha256(resumeInput),
    definitionHash: sha256(definition),
    inputHash: sha256(snapshot),
    inputSnapshot: stableJson(snapshot),
  };
}

export async function materializeCurrentEvaluations(userId: string, evaluator: Evaluator, db: PrismaClient = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { defaultResumeId: true } });
  if (!user?.defaultResumeId) return [];
  const resume = await db.resume.findFirst({ where: { id: user.defaultResumeId, profile: { userId } }, include: resumeDetailInclude });
  if (!resume) return [];
  const jobs = await db.job.findMany({
    where: { userId },
    include: { JobTitle: true, Company: true, Location: true },
  });
  const rows: any[] = [];
  for (const job of jobs) {
    const identity = await canonicalInput(job, resume, evaluator);
    if (!identity) continue;
    await db.jobEvaluation.updateMany({
      where: { userId, jobId: job.id, evaluatorKey: evaluator.evaluatorKey, evaluatorVersion: evaluator.evaluatorVersion, isCurrent: true, inputHash: { not: identity.inputHash } },
      data: { isCurrent: false },
    });
    let row = await db.jobEvaluation.findFirst({ where: { jobId: job.id, resumeId: resume.id, evaluatorKey: evaluator.evaluatorKey, evaluatorVersion: evaluator.evaluatorVersion, inputHash: identity.inputHash } });
    if (!row) {
      try {
        row = await db.jobEvaluation.create({ data: { userId, jobId: job.id, resumeId: resume.id, evaluatorKey: evaluator.evaluatorKey, evaluatorVersion: evaluator.evaluatorVersion, isCurrent: true, status: "pending", ...identity } });
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        row = await db.jobEvaluation.findFirstOrThrow({ where: { jobId: job.id, resumeId: resume.id, evaluatorKey: evaluator.evaluatorKey, evaluatorVersion: evaluator.evaluatorVersion, inputHash: identity.inputHash } });
      }
    } else if (!row.isCurrent) {
      row = await db.jobEvaluation.update({ where: { id: row.id }, data: { isCurrent: true } });
    }
    rows.push(row);
  }
  return rows;
}

export async function claimEvaluations(userId: string, evaluator: Evaluator, batch: number, leaseMs: number, db: PrismaClient = prisma) {
  await materializeCurrentEvaluations(userId, evaluator, db);
  return withSqliteBusyRetry(() => db.$transaction(async (tx) => {
    const now = new Date();
    const candidates = await tx.jobEvaluation.findMany({
      where: { userId, evaluatorKey: evaluator.evaluatorKey, evaluatorVersion: evaluator.evaluatorVersion, isCurrent: true, OR: [
        { status: "pending" }, { status: "retry", nextAttemptAt: { lte: now } }, { status: "running", leaseExpiresAt: { lte: now } },
      ] }, orderBy: { createdAt: "asc" }, take: batch,
    });
    const claimed = [];
    for (const candidate of candidates) {
      const leaseToken = randomUUID();
      const leaseExpiresAt = new Date(now.getTime() + leaseMs);
      const updated = await tx.jobEvaluation.updateMany({
        where: { id: candidate.id, userId, isCurrent: true, OR: [
          { status: "pending" }, { status: "retry", nextAttemptAt: { lte: now } }, { status: "running", leaseExpiresAt: { lte: now } },
        ] },
        data: { status: "running", attemptCount: { increment: 1 }, leaseToken, leaseExpiresAt, nextAttemptAt: null },
      });
      if (updated.count) claimed.push(await tx.jobEvaluation.findUniqueOrThrow({ where: { id: candidate.id } }));
    }
    return claimed;
  }));
}

export async function completeEvaluation(userId: string, id: string, leaseToken: string, inputHash: string, result: Record<string, unknown>, db: PrismaClient = prisma) {
  const resultJson = stableJson(result);
  const resultHash = sha256(resultJson);
  const row = await db.jobEvaluation.findFirst({ where: { id, userId } });
  if (!row) return "missing" as const;
  if (row.status === "succeeded" && row.leaseToken === leaseToken && row.inputHash === inputHash && row.resultHash === resultHash) return "idempotent" as const;
  const updated = await db.jobEvaluation.updateMany({ where: { id, userId, status: "running", leaseToken, inputHash }, data: { status: "succeeded", resultJson, resultHash, evaluatedAt: new Date(), leaseExpiresAt: null, lastError: null } });
  return updated.count ? "completed" as const : "conflict" as const;
}

export async function failEvaluation(userId: string, id: string, leaseToken: string, inputHash: string, error: string, db: PrismaClient = prisma) {
  const row = await db.jobEvaluation.findFirst({ where: { id, userId } });
  const lastError = error.trim().slice(0, 2000);
  if (!row) return "missing" as const;
  if ((row.status === "failed" || row.status === "retry") && row.leaseToken === leaseToken && row.inputHash === inputHash && row.lastError === lastError) return "idempotent" as const;
  if (row.status !== "running" || row.leaseToken !== leaseToken || row.inputHash !== inputHash) return "conflict" as const;
  const terminal = row.attemptCount >= MAX_ATTEMPTS;
  await db.jobEvaluation.update({ where: { id }, data: { status: terminal ? "failed" : "retry", lastError, leaseExpiresAt: null, nextAttemptAt: terminal ? null : new Date(Date.now() + RETRY_DELAYS_MS[Math.min(row.attemptCount - 1, RETRY_DELAYS_MS.length - 1)]) } });
  return terminal ? "failed" as const : "retry" as const;
}
