-- Reassign jobs referencing duplicate locations to the canonical (earliest) one
UPDATE "Job"
SET "locationId" = (
    SELECT l2."id"
    FROM "Location" l2
    WHERE l2."value" = (SELECT "value" FROM "Location" WHERE "id" = "Job"."locationId")
      AND l2."createdBy" = (SELECT "createdBy" FROM "Location" WHERE "id" = "Job"."locationId")
    ORDER BY l2."id"
    LIMIT 1
)
WHERE "locationId" IN (
    SELECT l."id" FROM "Location" l
    WHERE EXISTS (
        SELECT 1 FROM "Location" l2
        WHERE l2."value" = l."value" AND l2."createdBy" = l."createdBy" AND l2."id" < l."id"
    )
);

-- Reassign work experiences referencing duplicate locations
UPDATE "WorkExperience"
SET "locationId" = (
    SELECT l2."id"
    FROM "Location" l2
    WHERE l2."value" = (SELECT "value" FROM "Location" WHERE "id" = "WorkExperience"."locationId")
      AND l2."createdBy" = (SELECT "createdBy" FROM "Location" WHERE "id" = "WorkExperience"."locationId")
    ORDER BY l2."id"
    LIMIT 1
)
WHERE "locationId" IS NOT NULL AND "locationId" IN (
    SELECT l."id" FROM "Location" l
    WHERE EXISTS (
        SELECT 1 FROM "Location" l2
        WHERE l2."value" = l."value" AND l2."createdBy" = l."createdBy" AND l2."id" < l."id"
    )
);

-- Reassign educations referencing duplicate locations
UPDATE "Education"
SET "locationId" = (
    SELECT l2."id"
    FROM "Location" l2
    WHERE l2."value" = (SELECT "value" FROM "Location" WHERE "id" = "Education"."locationId")
      AND l2."createdBy" = (SELECT "createdBy" FROM "Location" WHERE "id" = "Education"."locationId")
    ORDER BY l2."id"
    LIMIT 1
)
WHERE "locationId" IS NOT NULL AND "locationId" IN (
    SELECT l."id" FROM "Location" l
    WHERE EXISTS (
        SELECT 1 FROM "Location" l2
        WHERE l2."value" = l."value" AND l2."createdBy" = l."createdBy" AND l2."id" < l."id"
    )
);

-- Delete duplicate locations (keep the one with the lowest id per value+createdBy)
DELETE FROM "Location"
WHERE "id" NOT IN (
    SELECT MIN("id") FROM "Location" GROUP BY "value", "createdBy"
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_value_createdBy_key" ON "Location"("value", "createdBy");
