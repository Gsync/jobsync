-- Guards against duplicate automation-discovered jobs at the DB level, since
-- app-level dedup (dedupeJobs in scraper/utils.ts) reads existing URLs at the
-- start of a run and can't see another concurrent run's in-flight saves.
-- Scoped to automationId IS NOT NULL so it never affects manually-created
-- jobs, which legitimately reuse placeholder/generic URLs. Partial index,
-- not expressible via Prisma's schema DSL.
CREATE UNIQUE INDEX "Job_userId_jobUrl_automation_key"
ON "Job"("userId", "jobUrl")
WHERE "automationId" IS NOT NULL;
