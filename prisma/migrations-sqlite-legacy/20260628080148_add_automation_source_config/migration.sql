-- AlterTable
ALTER TABLE "Automation" ADD COLUMN "sourceConfig" TEXT;

-- AlterTable
ALTER TABLE "AutomationRun" ADD COLUMN "funnelStats" TEXT;
