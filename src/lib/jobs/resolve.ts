import prisma from "@/lib/db";
import { JOB_TYPES, WORKPLACE_TYPES } from "@/models/job.model";

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

export async function resolveCompany(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  const trimmed = label.trim();
  const value = trimmed.toLowerCase();
  const existing = await prisma.company.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, created: false };
  const created = await prisma.company.create({
    data: { label: trimmed, value, createdBy: userId },
  });
  return { id: created.id, label: created.label, created: true };
}

export async function resolveJobTitle(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  const trimmed = label.trim();
  const value = trimmed.toLowerCase();
  const existing = await prisma.jobTitle.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, created: false };
  const created = await prisma.jobTitle.create({
    data: { label: trimmed, value, createdBy: userId },
  });
  return { id: created.id, label: created.label, created: true };
}

export async function resolveLocation(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  const trimmed = label.trim();
  const value = trimmed.toLowerCase();
  const existing = await prisma.location.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, created: false };
  const record = await prisma.location.create({
    data: { label: trimmed, value, createdBy: userId },
  });
  return { id: record.id, label: record.label, created: true };
}

export async function resolveJobSource(
  label: string,
  userId: string,
): Promise<ResolvedEntity> {
  const trimmed = label.trim();
  const value = trimmed.toLowerCase();
  const existing = await prisma.jobSource.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, created: false };
  const record = await prisma.jobSource.create({
    data: { label: trimmed, value, createdBy: userId },
  });
  return { id: record.id, label: record.label, created: true };
}

export async function resolveTag(
  label: string,
  userId: string,
): Promise<ResolvedTag> {
  const trimmed = label.trim();
  const value = trimmed.toLowerCase();
  const existing = await prisma.tag.findUnique({
    where: { value_createdBy: { value, createdBy: userId } },
  });
  if (existing) return { id: existing.id, label: existing.label, value: existing.value, createdBy: existing.createdBy, created: false };
  const tag = await prisma.tag.create({
    data: { label: trimmed, value, createdBy: userId },
  });
  return { id: tag.id, label: tag.label, value: tag.value, createdBy: tag.createdBy, created: true };
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
    const key = trimmed.toLowerCase();
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
