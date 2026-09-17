-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    CONSTRAINT "Stage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    CONSTRAINT "WorkspaceField_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "contactId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "subject" TEXT,
    "body" TEXT,
    "paperCited" TEXT,
    "sentAt" DATETIME,
    "followUpDue" DATETIME,
    "repliedAt" DATETIME,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outreach_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobUrl" TEXT,
    "description" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "workplaceType" TEXT,
    "createdAt" DATETIME NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedDate" DATETIME,
    "dueDate" DATETIME,
    "statusId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobSourceId" TEXT,
    "salaryRange" TEXT,
    "locationId" TEXT,
    "resumeId" TEXT,
    "coverLetterId" TEXT,
    "workspaceId" TEXT,
    "automationId" TEXT,
    "matchScore" INTEGER,
    "matchData" TEXT,
    "discoveryStatus" TEXT,
    "discoveredAt" DATETIME,
    "createdVia" TEXT,
    "descriptionCompleteness" TEXT,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("applied", "appliedDate", "automationId", "companyId", "coverLetterId", "createdAt", "createdVia", "description", "descriptionCompleteness", "discoveredAt", "discoveryStatus", "dueDate", "id", "jobSourceId", "jobTitleId", "jobType", "jobUrl", "locationId", "matchData", "matchScore", "resumeId", "salaryRange", "statusId", "userId", "workplaceType") SELECT "applied", "appliedDate", "automationId", "companyId", "coverLetterId", "createdAt", "createdVia", "description", "descriptionCompleteness", "discoveredAt", "discoveryStatus", "dueDate", "id", "jobSourceId", "jobTitleId", "jobType", "jobUrl", "locationId", "matchData", "matchScore", "resumeId", "salaryRange", "statusId", "userId", "workplaceType" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_userId_automationId_idx" ON "Job"("userId", "automationId");
CREATE INDEX "Job_userId_discoveryStatus_idx" ON "Job"("userId", "discoveryStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Workspace_userId_type_idx" ON "Workspace"("userId", "type");

-- CreateIndex
CREATE INDEX "Stage_workspaceId_order_idx" ON "Stage"("workspaceId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceField_workspaceId_key_key" ON "WorkspaceField"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "Outreach_jobId_idx" ON "Outreach"("jobId");

-- CreateIndex
CREATE INDEX "Outreach_contactId_idx" ON "Outreach"("contactId");

-- CreateIndex
CREATE INDEX "Outreach_followUpDue_idx" ON "Outreach"("followUpDue");
