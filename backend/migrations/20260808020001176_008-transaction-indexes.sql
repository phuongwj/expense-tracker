-- Up Migration

--Speeds up lookups on personal transactions for the user
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Speeds up lookups on group transactions for a group
CREATE INDEX idx_transactions_group_id ON transactions(group_id);

-- Speeds up the join between transaction_splits and transactions for balance calculations 
CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);

-- Speeds up filtering splits for a given user
CREATE INDEX idx_transaction_splits_user_id ON transaction_splits(user_id);

-- Speeds up settlement lookups for groups
CREATE INDEX idx_settlements_group_id ON settlements(group_id);

-- Down Migration

DROP INDEX IF EXISTS idx_transactions_user_id;
DROP INDEX IF EXISTS idx_transactions_group_id;
DROP INDEX IF EXISTS idx_transaction_splits_transaction_id;
DROP INDEX IF EXISTS idx_transaction_splits_user_id;
DROP INDEX IF EXISTS idx_settlements_group_id;