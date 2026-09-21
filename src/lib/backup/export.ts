import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import db from "@/lib/db";
import { INSERT_ORDER, MODEL_SPECS, type BackupModel } from "./ordering";
import { BackupDataSchema, type BackupData } from "./schema";
import { buildManifest } from "./manifest";
import { isResumeFilePath } from "@/lib/resumeFiles";

type Row = Record<string, unknown>;

// Job and Question need their tag ids and JobStageType needs its status value;
// none of the three is a plain column. Prisma's implicit m2m tables are not
// models, so this include is the only way the join rows reach the file at all.
const ROW_INCLUDE: Partial<Record<BackupModel, Record<string, unknown>>> = {
  Job: { Status: { select: { value: true } }, tags: { select: { id: true } } },
  Question: { tags: { select: { id: true } } },
  JobStageType: { Status: { select: { value: true } } },
};

function stripOwnership(model: BackupModel, row: Row): Row {
  const owner = MODEL_SPECS[model].owner;
  if (!owner) return row;
  const { [owner]: _dropped, ...rest } = row;
  return rest;
}

export async function collectBackupData(userId: string): Promise<BackupData> {
  // Array form: a read-only batch that sees one snapshot without the 5s
  // interactive-transaction timeout. See the spec's Snapshot consistency note.
  const reads = INSERT_ORDER.map((model) => {
    const spec = MODEL_SPECS[model];
    const delegate = (db as unknown as Record<string, { findMany: (a: unknown) => Promise<Row[]> }>)[
      spec.delegate
    ];
    const include = ROW_INCLUDE[model];
    return delegate.findMany(
      include ? { where: spec.scope(userId), include } : { where: spec.scope(userId) },
    );
  });

  // These two ride inside the same batch, not alongside it. defaultResumeId is
  // exactly the field likely to move mid-export, and a backup naming a resume
  // the file does not contain is the dangling reference the snapshot exists to
  // prevent.
  const batch = [
    ...reads,
    db.user.findUnique({
      where: { id: userId },
      select: { defaultResumeId: true },
    }),
    db.jobStatus.findMany({
      // Statuses reached by a job OR by a stage type: a seeded Withdrawn stage
      // type long predates any withdrawn job, and its statusValue has to
      // resolve on import.
      where: {
        OR: [{ jobs: { some: { userId } } }, { stageTypes: { some: { createdBy: userId } } }],
      },
      select: { label: true, value: true },
    }),
  ];

  const batchResults = (await db.$transaction(batch as never)) as unknown as unknown[];
  const results = batchResults.slice(0, INSERT_ORDER.length) as Row[][];
  const userRow = batchResults[INSERT_ORDER.length] as { defaultResumeId: string | null } | null;
  const statuses = batchResults[INSERT_ORDER.length + 1] as { label: string; value: string }[];

  const raw: Record<string, unknown> = {};
  const jobToTag: { jobId: string; tagId: string }[] = [];
  const questionToTag: { questionId: string; tagId: string }[] = [];

  INSERT_ORDER.forEach((model, index) => {
    raw[model] = results[index].map((row) => {
      const clean = stripOwnership(model, row);

      if (model === "Job") {
        const { statusId, Status, tags, ...rest } = clean as Row & {
          Status: { value: string };
          tags: { id: string }[];
        };
        for (const tag of tags ?? []) jobToTag.push({ jobId: rest.id as string, tagId: tag.id });
        return { ...rest, statusValue: Status.value };
      }

      if (model === "JobStageType") {
        const { statusId, Status, ...rest } = clean as Row & {
          Status: { value: string };
        };
        return { ...rest, statusValue: Status.value };
      }

      if (model === "Question") {
        const { tags, ...rest } = clean as Row & { tags: { id: string }[] };
        for (const tag of tags ?? []) {
          questionToTag.push({ questionId: rest.id as string, tagId: tag.id });
        }
        return rest;
      }

      return clean;
    });
  });

  raw._JobToTag = jobToTag;
  raw._QuestionToTag = questionToTag;
  raw.jobStatuses = statuses;
  raw.user = { defaultResumeId: userRow?.defaultResumeId ?? null };

  return BackupDataSchema.parse(raw);
}

export async function buildBackupZip(
  userId: string,
  sourceEmail: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const data = await collectBackupData(userId);

  // File bytes are read outside the read transaction. A row committed inside
  // the snapshot whose bytes land later is covered by the fileMissing marker.
  const zip = new JSZip();
  for (const file of data.File) {
    // A stored path outside the resumes directory is never read into the zip
    if (!isResumeFilePath(file.filePath)) {
      file.fileMissing = true;
      continue;
    }
    try {
      const bytes = await fs.readFile(file.filePath);
      zip.file(`files/${file.id}/${path.basename(file.filePath)}`, bytes);
    } catch {
      file.fileMissing = true;
    }
  }

  const manifest = buildManifest(data, sourceEmail);
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("data.json", JSON.stringify(data));

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return { buffer, fileName: `jobsync-backup-${stamp}.zip` };
}
