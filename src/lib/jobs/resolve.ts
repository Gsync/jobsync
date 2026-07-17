import prisma from "@/lib/db";
import { JOB_TYPES, WORKPLACE_TYPES } from "@/models/job.model";
import { canonicalizeEntityValue } from "./canonicalize";

export interface ResolvedEntity {
  id: string;
  label: string;
  created: boolean;
}

// Extended shape needed so createTag's callers (TagInput.tsx) get back the full Tag
export interface ResolvedTag extends ResolvedEntity {
  value: string;
  createdBy: string;
}

// Bucket A — resolve-or-create by exact-normalized value

interface EntityRow {
  id: string;
  label: string;
}

interface EntityDelegate {
  findUnique(args: {
    where: { value_createdBy: { value: string; createdBy: string } };
  }): Promise<EntityRow | null>;
  create(args: {
    data: { label: string; value: string; createdBy: string };
  }): Promise<EntityRow>;
}

// findUnique-then-create is a check-then-act race under the
// value_createdBy unique constraint: if two concurrent calls resolve the
// same value, the loser's create throws P2002. Re-fetch and return the
// winner's row instead of propagating, so a benign race never surfaces as
// an error to the caller (e.g. runner.ts's job-save catch, which can't
// distinguish this from an unrelated Job.jobUrl race).
async function resolveEntity(
  delegate: EntityDelegate,
  label: string,
  userId: string,
  opts: { stripLegalSuffix?: boolean } = {},
): Promise<ResolvedEntity> {
  const trimmed = label.trim();
  const value = canonicalizeEntityValue(trimmed, opts);
  if (!value) throw new Error("A non-empty label is required");
  const existing = await delegate.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, created: false };

  try {
    const created = await delegate.create({
      data: { label: trimmed, value, createdBy: userId },
    });
    return { id: created.id, label: created.label, created: true };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const winner = await delegate.findUnique({
        where: { value_createdBy: { value, createdBy: userId } },
      });
      if (winner) return { id: winner.id, label: winner.label, created: false };
    }
    throw err;
  }
}

export function resolveCompany(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  return resolveEntity(prisma.company, label, userId, { stripLegalSuffix: true });
}

export function resolveJobTitle(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  return resolveEntity(prisma.jobTitle, label, userId);
}

export function resolveLocation(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  return resolveEntity(prisma.location, label, userId);
}

export function resolveJobSource(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  return resolveEntity(prisma.jobSource, label, userId);
}

export async function resolveTag(
  label: string,
  userId: string,
): Promise<ResolvedTag> {
  const trimmed = label.trim();
  const value = canonicalizeEntityValue(trimmed);
  const existing = await prisma.tag.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, value: existing.value, createdBy: existing.createdBy, created: false };
  try {
    const tag = await prisma.tag.create({
      data: { label: trimmed, value, createdBy: userId },
    });
    return { id: tag.id, label: tag.label, value: tag.value, createdBy: tag.createdBy, created: true };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const winner = await prisma.tag.findUnique({
        where: { value_createdBy: { value, createdBy: userId } },
      });
      if (winner) {
        return { id: winner.id, label: winner.label, value: winner.value, createdBy: winner.createdBy, created: false };
      }
    }
    throw err;
  }
}

export async function resolveTags(
  labels: string[],
  userId: string,
  maxTags: number,
): Promise<{ resolved: ResolvedEntity[]; dropped: string[] }> {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const l of labels) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    const key = canonicalizeEntityValue(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(trimmed);
    }
  }

  const toResolve = unique.slice(0, maxTags);
  const dropped = unique.slice(maxTags);

  const resolved = await Promise.all(toResolve.map((l) => resolveTag(l, userId)));
  return { resolved, dropped };
}

// Bucket B — resolve-ONLY, never create

export function resolveJobType(input?: string): string {
  const entries = Object.entries(JOB_TYPES) as [string, string][];
  if (!input) return entries[0][0];
  const match = entries.find(
    ([key, value]) =>
      key.toLowerCase() === input.toLowerCase() ||
      value.toLowerCase() === input.toLowerCase(),
  );
  if (match) return match[0];
  const valid = entries.map(([, value]) => value);
  throw new Error(`Invalid jobType "${input}". Valid values: ${valid.join(", ")}`);
}

export function resolveWorkplaceType(input?: string): string | null {
  if (!input) return null;
  const entries = Object.entries(WORKPLACE_TYPES) as [string, string][];
  const match = entries.find(
    ([key, value]) =>
      key.toLowerCase() === input.toLowerCase() ||
      value.toLowerCase() === input.toLowerCase(),
  );
  if (match) return match[0];
  const valid = entries.map(([, value]) => value);
  throw new Error(`Invalid workplaceType "${input}". Valid values: ${valid.join(", ")}`);
}

export async function resolveJobStatus(value?: string): Promise<string> {
  const target = (value ?? "draft").toLowerCase();
  const status = await prisma.jobStatus.findUnique({ where: { value: target } });
  if (!status) {
    const all = await prisma.jobStatus.findMany({ select: { value: true } });
    throw new Error(
      `Invalid status "${target}". Valid values: ${all.map((s) => s.value).join(", ")}`,
    );
  }
  return status.id;
}
