-- Replace the subjective priority label with likelihood and impact, scored 1-5 each.
--
-- The point of this migration is that nothing is lost. SQLite cannot drop a
-- column in place, so Prisma rebuilds the table; the copy step below is
-- hand-written so that each existing priority is mapped forward instead of
-- being discarded:
--
--   HIGH   -> 4 x 4 = 16  (Critical)
--   MEDIUM -> 3 x 3 =  9  (Medium)
--   LOW    -> 2 x 2 =  4  (Low)
--
-- These are an approximation of a label that was never scored on two axes.
-- They exist so no assessment work is lost, not because anyone assessed them.
-- Every migrated gap should be re-scored deliberately. See DECISIONS.md 0011.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "likelihood" INTEGER,
    "impact" INTEGER,
    "owner" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assessments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_assessments" ("id", "categoryId", "status", "notes", "likelihood", "impact", "owner", "updatedAt")
SELECT
    "id",
    "categoryId",
    "status",
    "notes",
    CASE "priority" WHEN 'HIGH' THEN 4 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 2 ELSE NULL END,
    CASE "priority" WHEN 'HIGH' THEN 4 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 2 ELSE NULL END,
    "owner",
    "updatedAt"
FROM "assessments";

DROP TABLE "assessments";
ALTER TABLE "new_assessments" RENAME TO "assessments";
CREATE UNIQUE INDEX "assessments_categoryId_key" ON "assessments"("categoryId");
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
