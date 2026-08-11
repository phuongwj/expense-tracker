-- Up Migration

-- Speeds up the paid_by side of getAllSplitsForUser's OR clause
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);

-- Speeds up both sides of getAllSettlementsForUser's OR clause
CREATE INDEX idx_settlements_paid_by ON settlements(paid_by);
CREATE INDEX idx_settlements_paid_to ON settlements(paid_to);

-- Down Migration

DROP INDEX IF EXISTS idx_transactions_paid_by;
DROP INDEX IF EXISTS idx_settlements_paid_by;
DROP INDEX IF EXISTS idx_settlements_paid_to;