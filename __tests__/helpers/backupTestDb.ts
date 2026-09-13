import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { CONTACT_ROLES, JOB_SOURCES, JOB_STATUSES } from "@/lib/constants";

export function makeTestDbUrl(): { url: string; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-backup-"));
  return { url: `file:${path.join(dir, "test.db")}`, dir };
}

// db push rather than migrate deploy: the round-trip asserts against the
// current schema, not the migration history, and push is much faster.
export function pushSchema(url: string): void {
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
  );
}

// Mirrors what signup() seeds, so "empty account" means the same thing here as
// it does in the app.
export async function seedAccount(
  prisma: PrismaClient,
  email: string,
): Promise<string> {
  for (const status of JOB_STATUSES) {
    await prisma.jobStatus.upsert({
      where: { value: status.value },
      update: {},
      create: { label: status.label, value: status.value },
    });
  }

  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Test User", email, password: "x" },
  });

  for (const source of JOB_SOURCES) {
    await prisma.jobSource.create({
      data: { label: source.label, value: source.value, createdBy: user.id },
    });
  }

  await prisma.contactRole.createMany({
    data: CONTACT_ROLES.map((role) => ({
      label: role.label,
      value: role.value,
      createdBy: user.id,
    })),
  });

  return user.id;
}
