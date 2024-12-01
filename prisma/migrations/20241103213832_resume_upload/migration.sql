-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "FileId" TEXT,
    CONSTRAINT "Resume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Resume_FileId_fkey" FOREIGN KEY ("FileId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Resume" ("createdAt", "id", "profileId", "title", "updatedAt") SELECT "createdAt", "id", "profileId", "title", "updatedAt" FROM "Resume";
DROP TABLE "Resume";
ALTER TABLE "new_Resume" RENAME TO "Resume";
CREATE UNIQUE INDEX "Resume_FileId_key" ON "Resume"("FileId");
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobUrl" TEXT,
    "description" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
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
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("applied", "appliedDate", "companyId", "createdAt", "description", "dueDate", "id", "jobSourceId", "jobTitleId", "jobType", "jobUrl", "locationId", "salaryRange", "statusId", "userId") SELECT "applied", "appliedDate", "companyId", "createdAt", "description", "dueDate", "id", "jobSourceId", "jobTitleId", "jobType", "jobUrl", "locationId", "salaryRange", "statusId", "userId" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_key_check("Resume");
PRAGMA foreign_key_check("Job");
PRAGMA foreign_keys=ON;
