-- AlterTable
ALTER TABLE "Job" ADD COLUMN "emailContent" TEXT;
ALTER TABLE "Job" ADD COLUMN "emailLink" TEXT;
ALTER TABLE "Job" ADD COLUMN "emailReceivedAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "emailSeenAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "emailSubject" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT,
    CONSTRAINT "File_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_File" ("fileName", "filePath", "fileType", "id", "uploadedAt") SELECT "fileName", "filePath", "fileType", "id", "uploadedAt" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
