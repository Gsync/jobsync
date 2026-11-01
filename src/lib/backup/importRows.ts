import { CONTACT_ROLES, JOB_STAGES } from "@/lib/constants";
import { buildCreateData, type IdMap } from "./idmap";
import { BackupError } from "./manifest";
import { normalizeAutomation, normalizeAutomationRun } from "./normalize";
import {
  INSERT_ORDER,
  LOOKUP_MODELS,
  MODEL_SPECS,
  type BackupModel,
} from "./ordering";
import type { BackupData, BackupManifest } from "./schema";
import type { Tx } from "./import";

export function rowsFor(
  data: BackupData,
  model: BackupModel,
): Record<string, unknown>[] {
  return (data as unknown as Record<string, Record<string, unknown>[]>)[model];
}

// Straight inserts, no upsert. The wipe on the line above deleted every lookup
// row this user owned, so there is nothing left to resolve against — an
// "existing row" check here can never match. Replace-not-merge is the point:
// post-import counts equal the manifest for every table.
export async function insertLookups(
  tx: Tx,
  data: BackupData,
  idMap: IdMap,
  userId: string,
  statusByValue: Map<string, string>,
): Promise<void> {
  for (const model of LOOKUP_MODELS) {
    const spec = MODEL_SPECS[model];
    for (const row of (data as unknown as Record<string, { id: string; value: string }[]>)[model]) {
      const newId = idMap.mint(row.id);
      const { id: _old, ...rest } = row;

      // The only lookup model with a foreign key. JobStatus is global and its
      // ids differ between installs, so the file carries the value (D3).
      if (model === "JobStageType") {
        const { statusValue, ...typeRest } = rest as typeof rest & { statusValue: string };
        const statusId = statusByValue.get(statusValue);
        // Refusing beats defaulting: a wrong parent status would put the
        // derived-status invariant permanently out of step on every job.
        if (!statusId) {
          throw new BackupError(
            `Stage type "${row.value}" names status "${statusValue}", which is not in the backup.`,
          );
        }
        await tx[spec.delegate].create({
          data: { ...typeRest, id: newId, statusId, createdBy: userId },
        });
        continue;
      }

      await tx[spec.delegate].create({
        data: { ...rest, id: newId, createdBy: userId },
      });
    }
  }
}

export async function reseedMissingDefaults(
  tx: Tx,
  data: BackupData,
  manifest: BackupManifest,
  userId: string,
): Promise<void> {
  // A backup from before contacts carries no roles, and the wipe above
  // just deleted the seeded ones — reseed rather than leave none.
  if (manifest.counts.ContactRole === undefined && data.ContactRole.length === 0) {
    await tx.contactRole.createMany({
      data: CONTACT_ROLES.map((role) => ({
        label: role.label,
        value: role.value,
        createdBy: userId,
      })),
    });
  }

  // A backup from before stages carries no stage types, and the wipe
  // above just deleted the seeded ones — reseed rather than leave none,
  // or Add Stage and every status dropdown has nothing to resolve.
  if (manifest.counts.JobStageType === undefined && data.JobStageType.length === 0) {
    const stageStatuses = (await tx.jobStatus.findMany({
      select: { id: true, value: true },
    })) as unknown as { id: string; value: string }[];
    const stageStatusIds = new Map(stageStatuses.map((s) => [s.value, s.id]));
    await tx.jobStageType.createMany({
      data: JOB_STAGES.map((stage) => ({
        label: stage.label,
        value: stage.value,
        statusId: stageStatusIds.get(stage.status)!,
        sortOrder: stage.sortOrder,
        createdBy: userId,
      })),
    });
  }
}

export async function insertRows(
  tx: Tx,
  data: BackupData,
  idMap: IdMap,
  userId: string,
  statusByValue: Map<string, string>,
  newFilePaths: Map<string, string>,
  newFileTypes: Map<string, string>,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const model of INSERT_ORDER) {
    if (MODEL_SPECS[model].lookup) continue;
    const spec = MODEL_SPECS[model];
    const rows = rowsFor(data, model);
    counts[model] = rows.length;

    for (const row of rows) {
      let payload = buildCreateData(model, row, idMap, userId);

      if (model === "File") {
        const { fileMissing: _marker, ...rest } = payload;
        payload = {
          ...rest,
          filePath: newFilePaths.get(row.id as string)!,
          // From the sniff, never the payload. The fallback only reaches
          // rows whose bytes were absent or rejected, where the column
          // describes a file that is not on disk either way.
          fileType: newFileTypes.get(row.id as string) ?? "application/pdf",
        };
      }
      if (model === "Job") {
        const { statusValue, ...rest } = payload as { statusValue: string };
        payload = { ...rest, statusId: statusByValue.get(statusValue)! };
      }
      if (model === "Automation") {
        payload = normalizeAutomation(payload as never);
      }
      if (model === "AutomationRun") {
        payload = normalizeAutomationRun(payload as never);
      }

      await tx[spec.delegate].create({ data: payload });
    }
  }

  return counts;
}

// Join tables last: both endpoints have to exist first.
export async function connectTags(
  tx: Tx,
  data: BackupData,
  idMap: IdMap,
): Promise<Record<string, number>> {
  for (const link of data._JobToTag) {
    await tx.job.update({
      where: { id: idMap.get(link.jobId)! },
      data: { tags: { connect: { id: idMap.get(link.tagId)! } } },
    });
  }
  for (const link of data._QuestionToTag) {
    await tx.question.update({
      where: { id: idMap.get(link.questionId)! },
      data: { tags: { connect: { id: idMap.get(link.tagId)! } } },
    });
  }
  return {
    _JobToTag: data._JobToTag.length,
    _QuestionToTag: data._QuestionToTag.length,
  };
}
