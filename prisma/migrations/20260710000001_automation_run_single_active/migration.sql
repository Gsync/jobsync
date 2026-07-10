-- Prevents two AutomationRun rows from being "running"/"cancelling" at once
-- for the same automation. The prior guard (SELECT-then-INSERT inside a
-- $transaction) assumed SQLite serializes concurrent write transactions,
-- but deferred transactions don't take a write lock until the first write,
-- so two concurrent runAutomation() calls could both pass the SELECT check
-- before either INSERTed, producing duplicate concurrent runs (and, in turn,
-- duplicate discovered jobs since each run computed its own dedup snapshot).
-- Partial index (not expressible via Prisma's schema DSL) so historical
-- completed/failed/cancelled runs are unaffected.
CREATE UNIQUE INDEX "AutomationRun_automationId_active_key"
ON "AutomationRun"("automationId")
WHERE "status" IN ('running', 'cancelling');
