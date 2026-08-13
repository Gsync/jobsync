-- Durable, source-independent asynchronous evaluation lifecycle.
CREATE TABLE "JobEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "evaluatorKey" TEXT NOT NULL,
    "evaluatorVersion" TEXT NOT NULL,
    "definitionHash" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "jobHash" TEXT NOT NULL,
    "resumeHash" TEXT NOT NULL,
    "inputSnapshot" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME,
    "leaseToken" TEXT,
    "leaseExpiresAt" DATETIME,
    "resultJson" TEXT,
    "resultHash" TEXT,
    "lastError" TEXT,
    "evaluatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobEvaluation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobEvaluation_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "JobEvaluation_jobId_resumeId_evaluatorKey_evaluatorVersion_inputHash_key"
  ON "JobEvaluation"("jobId", "resumeId", "evaluatorKey", "evaluatorVersion", "inputHash");
CREATE INDEX "JobEvaluation_userId_isCurrent_evaluatorKey_evaluatorVersion_idx"
  ON "JobEvaluation"("userId", "isCurrent", "evaluatorKey", "evaluatorVersion");
CREATE INDEX "JobEvaluation_userId_status_nextAttemptAt_idx"
  ON "JobEvaluation"("userId", "status", "nextAttemptAt");
CREATE INDEX "JobEvaluation_status_leaseExpiresAt_idx" ON "JobEvaluation"("status", "leaseExpiresAt");
CREATE INDEX "JobEvaluation_jobId_isCurrent_idx" ON "JobEvaluation"("jobId", "isCurrent");
