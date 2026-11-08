-- CreateTable
CREATE TABLE "JobEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "link" TEXT,
    "receivedAt" DATETIME,
    "seenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobEmail_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JobEmail_jobId_receivedAt_idx" ON "JobEmail"("jobId", "receivedAt");
