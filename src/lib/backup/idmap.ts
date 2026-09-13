import { randomUUID } from "crypto";
import { MODEL_SPECS, type BackupModel } from "./ordering";

// Foreign keys that are nullable in the schema. A dangling value in one of
// these is degraded to null (the spec's defaultResumeId rule generalised);
// a dangling required key aborts the import instead of silently reshaping it.
const OPTIONAL_FKS = new Set<string>([
  "Resume.FileId",
  "ResumeSection.summaryId",
  "WorkExperience.resumeSectionId",
  "Education.resumeSectionId",
  "LicenseOrCertification.resumeSectionId",
  "OtherSection.resumeSectionId",
  "Job.jobSourceId",
  "Job.locationId",
  "Job.resumeId",
  "Job.coverLetterId",
  "Job.automationId",
  "Contact.interviewId",
  "Contact.companyId",
  "Contact.locationId",
  "Contact.workedAtCompanyId",
  "Contact.roleId",
  "Task.activityTypeId",
  "Activity.taskId",
]);

export class IdMap {
  private map = new Map<string, string>();

  set(oldId: string, newId: string): void {
    this.map.set(oldId, newId);
  }

  get(oldId: string): string | undefined {
    return this.map.get(oldId);
  }

  // Fresh uuids remove a whole class of collision, and an id map has to exist
  // anyway because lookups resolve to pre-existing rows.
  mint(oldId: string): string {
    const newId = randomUUID();
    this.map.set(oldId, newId);
    return newId;
  }
}

export function buildCreateData(
  model: BackupModel,
  row: Record<string, unknown>,
  idMap: IdMap,
  userId: string,
): Record<string, unknown> {
  const spec = MODEL_SPECS[model];
  const data: Record<string, unknown> = { ...row };

  const newId = idMap.get(row.id as string);
  if (!newId) {
    throw new Error(`${model} row ${String(row.id)} has no minted id`);
  }
  data.id = newId;

  for (const field of Object.keys(spec.fks)) {
    const value = data[field];
    if (value === null || value === undefined) {
      data[field] = null;
      continue;
    }
    const mapped = idMap.get(value as string);
    if (mapped) {
      data[field] = mapped;
      continue;
    }
    if (OPTIONAL_FKS.has(`${model}.${field}`)) {
      data[field] = null;
      continue;
    }
    throw new Error(
      `${model}.${field} points at ${String(value)}, which is not in the backup`,
    );
  }

  // The client supplies the payload, the server supplies the owner — and no
  // model keeps an ownership column it does not declare. Both keys go
  // unconditionally: 14 of the 30 models own through a relation chain and have
  // neither column, so a stray userId riding in on a hand-edited data.json
  // would reach Prisma as an unknown argument and abort the whole import.
  delete data.userId;
  delete data.createdBy;

  if (spec.owner) {
    data[spec.owner] = userId;
  }

  return data;
}
