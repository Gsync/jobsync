/*
  Warnings:

  - You are about to drop the column `name` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `JobTitle` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `JobSource` table. All the data in the column will be lost.
  - You are about to drop the column `statusName` on the `JobStatus` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Company` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `JobTitle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `JobTitle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `JobTitle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Interview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `JobSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `JobSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobType` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `JobStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `JobStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Contact` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "stateProv" TEXT,
    "country" TEXT,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Location_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("country", "id") SELECT "country", "id" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE TABLE "new_JobTitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "JobTitle_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobTitle" ("id") SELECT "id" FROM "JobTitle";
DROP TABLE "JobTitle";
ALTER TABLE "new_JobTitle" RENAME TO "JobTitle";
CREATE UNIQUE INDEX "JobTitle_value_key" ON "JobTitle"("value");
CREATE TABLE "new_Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL,
    "jobId" TEXT NOT NULL,
    CONSTRAINT "Interview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Interview" ("id", "jobId") SELECT "id", "jobId" FROM "Interview";
DROP TABLE "Interview";
ALTER TABLE "new_Interview" RENAME TO "Interview";
CREATE TABLE "new_JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL
);
INSERT INTO "new_JobSource" ("id") SELECT "id" FROM "JobSource";
DROP TABLE "JobSource";
ALTER TABLE "new_JobSource" RENAME TO "JobSource";
CREATE UNIQUE INDEX "JobSource_value_key" ON "JobSource"("value");
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "appliedDate" DATETIME,
    "dueDate" DATETIME,
    "statusId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobSourceId" TEXT,
    "salaryRange" TEXT,
    "locationId" TEXT,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "JobStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("appliedDate", "companyId", "createdAt", "description", "dueDate", "id", "jobSourceId", "jobTitleId", "locationId", "salaryRange", "statusId", "userId") SELECT "appliedDate", "companyId", "createdAt", "description", "dueDate", "id", "jobSourceId", "jobTitleId", "locationId", "salaryRange", "statusId", "userId" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE TABLE "new_JobStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL
);
INSERT INTO "new_JobStatus" ("id") SELECT "id" FROM "JobStatus";
DROP TABLE "JobStatus";
ALTER TABLE "new_JobStatus" RENAME TO "JobStatus";
CREATE UNIQUE INDEX "JobStatus_value_key" ON "JobStatus"("value");
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Company_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("id", "logoUrl") SELECT "id", "logoUrl" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_value_key" ON "Company"("value");
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "interviewId" TEXT,
    CONSTRAINT "Contact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contact_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("email", "id", "interviewId", "name") SELECT "email", "id", "interviewId", "name" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
PRAGMA foreign_key_check("Location");
PRAGMA foreign_key_check("JobTitle");
PRAGMA foreign_key_check("Interview");
PRAGMA foreign_key_check("JobSource");
PRAGMA foreign_key_check("Job");
PRAGMA foreign_key_check("JobStatus");
PRAGMA foreign_key_check("Company");
PRAGMA foreign_key_check("Contact");
PRAGMA foreign_keys=ON;
