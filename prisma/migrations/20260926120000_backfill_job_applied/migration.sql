-- Jobs saved at an applying status through the old Add/Edit Job form kept
-- applied = false. Derived from the status, stage history and date only;
-- no appliedDate is invented. Idempotent.
UPDATE "Job" SET "applied" = 1
WHERE "applied" = 0
  AND (
    "appliedDate" IS NOT NULL
    OR "statusId" IN (
      SELECT "id" FROM "JobStatus"
      WHERE "value" IN ('applied', 'interview', 'offer', 'offer-accepted', 'offer-declined')
    )
    OR "id" IN (
      SELECT s."jobId" FROM "JobStage" s
      JOIN "JobStageType" t ON t."id" = s."stageTypeId"
      JOIN "JobStatus" st ON st."id" = t."statusId"
      WHERE st."value" IN ('applied', 'interview', 'offer', 'offer-accepted', 'offer-declined')
    )
  );
