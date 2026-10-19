-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" DATETIME,
    "atsProvider" TEXT,
    "atsToken" TEXT,
    "atsHost" TEXT,
    "websiteUrl" TEXT,
    "careersUrl" TEXT,
    "industry" TEXT,
    CONSTRAINT "Company_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("createdBy", "id", "label", "logoUrl", "value") SELECT "createdBy", "id", "label", "logoUrl", "value" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE INDEX "Company_createdBy_watched_idx" ON "Company"("createdBy", "watched");
CREATE UNIQUE INDEX "Company_value_createdBy_key" ON "Company"("value", "createdBy");
CREATE UNIQUE INDEX "Company_createdBy_atsProvider_atsToken_key" ON "Company"("createdBy", "atsProvider", "atsToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

