/*
  Warnings:

  - Added the required column `createdBy` to the `JobSource` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "JobSource_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobSource" ("id", "label", "value", "createdBy") SELECT "id", "label", "value", (SELECT "id" FROM "User" LIMIT 1) FROM "JobSource" WHERE (SELECT COUNT(*) FROM "User") > 0;
DROP TABLE "JobSource";
ALTER TABLE "new_JobSource" RENAME TO "JobSource";
CREATE UNIQUE INDEX "JobSource_value_key" ON "JobSource"("value");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
