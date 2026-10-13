/*
  Warnings:

  - You are about to drop the column `summaryId` on the `Resume` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[summaryId]` on the table `ResumeSection` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Resume" ("createdAt", "id", "profileId", "title", "updatedAt") SELECT "createdAt", "id", "profileId", "title", "updatedAt" FROM "Resume";
DROP TABLE "Resume";
ALTER TABLE "new_Resume" RENAME TO "Resume";
PRAGMA foreign_key_check("Resume");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "ResumeSection_summaryId_key" ON "ResumeSection"("summaryId");
