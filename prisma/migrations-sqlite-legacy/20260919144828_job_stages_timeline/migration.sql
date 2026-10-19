/*
  Warnings:

  - You are about to drop the `Interview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `interviewId` on the `Contact` table. All the data in the column will be lost.

*/
-- Data-only: JobStatus rows are seeded at signup, so existing databases need
-- the new status inserted. Shape copied from 20260904000000_job_status_offer_outcomes.
INSERT OR IGNORE INTO "JobStatus" ("id", "label", "value") VALUES
  ('3f2b6c41-88d5-4a0e-9d0a-6a1c9f0b7e22', 'Withdrawn', 'withdrawn');

-- CreateTable
CREATE TABLE "JobStageType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "JobStageType_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobStageType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "stageTypeId" TEXT NOT NULL,
    "occurredAt" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "notes" TEXT,
    "durationMins" INTEGER,
    "format" TEXT,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobStage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobStage_stageTypeId_fkey" FOREIGN KEY ("stageTypeId") REFERENCES "JobStageType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobStageInterviewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobStageInterviewer_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobStageInterviewer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobStagePrepQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "asked" BOOLEAN NOT NULL DEFAULT false,
    "askedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobStagePrepQuestion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobStagePrepQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "companyId" TEXT,
    "locationId" TEXT,
    "relationship" TEXT,
    "workedAtCompanyId" TEXT,
    "workedFrom" DATETIME,
    "workedTo" DATETIME,
    "roleId" TEXT,
    "notes" TEXT,
    "lastContactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_workedAtCompanyId_fkey" FOREIGN KEY ("workedAtCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ContactRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("companyId", "createdAt", "createdBy", "email", "id", "lastContactedAt", "linkedinUrl", "locationId", "name", "notes", "phone", "relationship", "roleId", "title", "updatedAt", "workedAtCompanyId", "workedFrom", "workedTo") SELECT "companyId", "createdAt", "createdBy", "email", "id", "lastContactedAt", "linkedinUrl", "locationId", "name", "notes", "phone", "relationship", "roleId", "title", "updatedAt", "workedAtCompanyId", "workedFrom", "workedTo" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_createdBy_idx" ON "Contact"("createdBy");
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Contact_workedAtCompanyId_idx" ON "Contact"("workedAtCompanyId");
CREATE INDEX "Contact_roleId_idx" ON "Contact"("roleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DropTable
-- After the Contact redefinition: the old Contact still holds the interviewId
-- FK into Interview until the rename completes.
PRAGMA foreign_keys=off;
DROP TABLE "Interview";
PRAGMA foreign_keys=on;

-- CreateIndex
CREATE INDEX "JobStageType_createdBy_idx" ON "JobStageType"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "JobStageType_value_createdBy_key" ON "JobStageType"("value", "createdBy");

-- CreateIndex
CREATE INDEX "JobStage_jobId_idx" ON "JobStage"("jobId");

-- CreateIndex
CREATE INDEX "JobStage_stageTypeId_idx" ON "JobStage"("stageTypeId");

-- Exactly one current stage per job. Partial index (not expressible in the
-- Prisma DSL) so historical stages are unaffected. Same mechanism as
-- 20260710000001_automation_run_single_active.
CREATE UNIQUE INDEX "JobStage_jobId_current_key"
ON "JobStage"("jobId")
WHERE "isCurrent" = 1;

-- CreateIndex
CREATE INDEX "JobStageInterviewer_contactId_idx" ON "JobStageInterviewer"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "JobStageInterviewer_stageId_contactId_key" ON "JobStageInterviewer"("stageId", "contactId");

-- CreateIndex
CREATE INDEX "JobStagePrepQuestion_questionId_idx" ON "JobStagePrepQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "JobStagePrepQuestion_stageId_questionId_key" ON "JobStagePrepQuestion"("stageId", "questionId");

-- Seed the fourteen default stage types for existing users. New accounts get
-- these from signup(). `value` is canonicalizeEntityValue(label), which is how
-- a status resolves back to its stage type (no isDefaultForStatus column).
INSERT INTO "JobStageType" ("id", "label", "value", "statusId", "sortOrder", "createdBy")
SELECT lower(
  substr(hex(randomblob(16)), 1, 8) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 12)
), t."label", t."value", s."id", t."sortOrder", u."id"
FROM "User" u
CROSS JOIN (
  SELECT 'New' AS "label", 'new' AS "value", 'new' AS "status", 0 AS "sortOrder"
  UNION ALL SELECT 'Draft', 'draft', 'draft', 1
  UNION ALL SELECT 'Applied', 'applied', 'applied', 2
  UNION ALL SELECT 'Interview', 'interview', 'interview', 3
  UNION ALL SELECT '1st Screening Interview', '1st screening interview', 'interview', 4
  UNION ALL SELECT '2nd Technical Interview', '2nd technical interview', 'interview', 5
  UNION ALL SELECT 'Final / Onsite Interview', 'final / onsite interview', 'interview', 6
  UNION ALL SELECT 'Offer', 'offer', 'offer', 7
  UNION ALL SELECT 'Offer Accepted', 'offer accepted', 'offer-accepted', 8
  UNION ALL SELECT 'Offer Declined', 'offer declined', 'offer-declined', 9
  UNION ALL SELECT 'Rejected', 'rejected', 'rejected', 10
  UNION ALL SELECT 'Expired', 'expired', 'expired', 11
  UNION ALL SELECT 'Archived', 'archived', 'archived', 12
  UNION ALL SELECT 'Withdrawn', 'withdrawn', 'withdrawn', 13
) t
JOIN "JobStatus" s ON s."value" = t."status";

-- Backfill, part 1 of 4: a New stage at Job.createdAt for every job. The
-- createdAt offsets below are deliberate: stages tiebreak on createdAt when
-- occurredAt is null, and CURRENT_TIMESTAMP is constant within a statement.
INSERT INTO "JobStage" ("id", "jobId", "stageTypeId", "occurredAt", "isCurrent", "createdAt", "updatedAt")
SELECT lower(
  substr(hex(randomblob(16)), 1, 8) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 12)
), j."id", t."id", j."createdAt", 0,
   datetime('now', '-3 seconds'), datetime('now', '-3 seconds')
FROM "Job" j
JOIN "JobStageType" t ON t."createdBy" = j."userId" AND t."value" = 'new';

-- Backfill, part 2 of 4: an Applied stage at Job.appliedDate, only where the
-- job is actually applied. appliedDate is taken verbatim — a null one leaves
-- the stage undated rather than inventing a timestamp.
INSERT INTO "JobStage" ("id", "jobId", "stageTypeId", "occurredAt", "isCurrent", "createdAt", "updatedAt")
SELECT lower(
  substr(hex(randomblob(16)), 1, 8) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 12)
), j."id", t."id", j."appliedDate", 0,
   datetime('now', '-2 seconds'), datetime('now', '-2 seconds')
FROM "Job" j
JOIN "JobStageType" t ON t."createdBy" = j."userId" AND t."value" = 'applied'
WHERE j."applied" = 1;

-- Backfill, part 3 of 4: an undated stage matching the job's current status,
-- marked current. Skipped where it would repeat one of the two stages above —
-- a job still at New, or at Applied with an Applied stage already written.
-- The CASE is the status -> stage-type reverse lookup: canonical form of the
-- status LABEL, which differs from status.value for the two offer outcomes.
INSERT INTO "JobStage" ("id", "jobId", "stageTypeId", "occurredAt", "isCurrent", "createdAt", "updatedAt")
SELECT lower(
  substr(hex(randomblob(16)), 1, 8) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 4) || '-' ||
  substr(hex(randomblob(16)), 1, 12)
), j."id", t."id", NULL, 1,
   datetime('now', '-1 seconds'), datetime('now', '-1 seconds')
FROM "Job" j
JOIN "JobStatus" s ON s."id" = j."statusId"
JOIN "JobStageType" t ON t."createdBy" = j."userId" AND t."value" = CASE s."value"
  WHEN 'offer-accepted' THEN 'offer accepted'
  WHEN 'offer-declined' THEN 'offer declined'
  ELSE s."value"
END
WHERE s."value" <> 'new'
  AND NOT (s."value" = 'applied' AND j."applied" = 1);

-- Backfill, part 4 of 4: where part 3 was skipped, the already-written dated
-- stage becomes the current one. Every backfilled job now has exactly one.
UPDATE "JobStage" SET "isCurrent" = 1
WHERE "id" IN (
  SELECT st."id"
  FROM "JobStage" st
  JOIN "Job" j ON j."id" = st."jobId"
  JOIN "JobStatus" s ON s."id" = j."statusId"
  JOIN "JobStageType" t ON t."id" = st."stageTypeId"
  WHERE (s."value" = 'new' AND t."value" = 'new')
     OR (s."value" = 'applied' AND j."applied" = 1 AND t."value" = 'applied')
);
