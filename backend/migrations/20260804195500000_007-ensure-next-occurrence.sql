-- Up Migration
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS next_occurrence DATE NULL;

-- Down Migration
ALTER TABLE transactions
DROP COLUMN IF EXISTS next_occurrence;
