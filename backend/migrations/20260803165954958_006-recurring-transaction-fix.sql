-- Up Migration
ALTER TABLE transactions
ADD COLUMN next_occurrence DATE NULL;
-- Down Migration
ALTER TABLE transactions
DROP COLUMN next_occurrence;