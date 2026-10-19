-- AlterTable
ALTER TABLE "Question" ADD COLUMN "createdVia" TEXT;

-- Backfill: grant questions:write to all existing tokens (all currently ["jobs:write"])
UPDATE "McpAccessToken" SET scopes = '["jobs:write","questions:write"]'
WHERE scopes = '["jobs:write"]';
