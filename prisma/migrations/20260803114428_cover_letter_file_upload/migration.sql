-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CoverLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "FileId" TEXT,
    CONSTRAINT "CoverLetter_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoverLetter_FileId_fkey" FOREIGN KEY ("FileId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CoverLetter" ("content", "createdAt", "id", "profileId", "title", "updatedAt") SELECT "content", "createdAt", "id", "profileId", "title", "updatedAt" FROM "CoverLetter";
DROP TABLE "CoverLetter";
ALTER TABLE "new_CoverLetter" RENAME TO "CoverLetter";
CREATE UNIQUE INDEX "CoverLetter_FileId_key" ON "CoverLetter"("FileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
