-- DropIndex
DROP INDEX "ActivityType_value_key";

-- DropIndex
DROP INDEX "Company_value_key";

-- DropIndex
DROP INDEX "JobSource_value_key";

-- DropIndex
DROP INDEX "JobTitle_value_key";

-- CreateIndex
CREATE UNIQUE INDEX "ActivityType_value_createdBy_key" ON "ActivityType"("value", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Company_value_createdBy_key" ON "Company"("value", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_value_createdBy_key" ON "JobSource"("value", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_value_createdBy_key" ON "JobTitle"("value", "createdBy");
