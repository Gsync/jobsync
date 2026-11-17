-- Job category (compulsory classification of a posting)
ALTER TABLE "Job" ADD COLUMN "jobCategory" TEXT NOT NULL DEFAULT 'INDUSTRY_OTHERS';

-- Email tracking: an agent attached an email it found in the user's inbox
ALTER TABLE "Job" ADD COLUMN "emailSubject" TEXT;
ALTER TABLE "Job" ADD COLUMN "emailContent" TEXT;
ALTER TABLE "Job" ADD COLUMN "emailLink" TEXT;
ALTER TABLE "Job" ADD COLUMN "emailReceivedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "emailSeenAt" TIMESTAMP(3);

-- Job attachments: files uploaded against a saved job
ALTER TABLE "File" ADD COLUMN "jobId" TEXT;
ALTER TABLE "File" ADD CONSTRAINT "File_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "JobEmail" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "link" TEXT,
    "receivedAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobEmail_jobId_receivedAt_idx" ON "JobEmail"("jobId", "receivedAt");

-- AddForeignKey
ALTER TABLE "JobEmail" ADD CONSTRAINT "JobEmail_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
