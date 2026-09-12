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
    "interviewId" TEXT,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_workedAtCompanyId_fkey" FOREIGN KEY ("workedAtCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ContactRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contact_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("companyId", "createdAt", "createdBy", "email", "id", "interviewId", "lastContactedAt", "linkedinUrl", "locationId", "name", "notes", "phone", "relationship", "title", "updatedAt", "workedAtCompanyId", "workedFrom", "workedTo") SELECT "companyId", "createdAt", "createdBy", "email", "id", "interviewId", "lastContactedAt", "linkedinUrl", "locationId", "name", "notes", "phone", "relationship", "title", "updatedAt", "workedAtCompanyId", "workedFrom", "workedTo" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_createdBy_idx" ON "Contact"("createdBy");
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Contact_workedAtCompanyId_idx" ON "Contact"("workedAtCompanyId");
CREATE INDEX "Contact_roleId_idx" ON "Contact"("roleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
