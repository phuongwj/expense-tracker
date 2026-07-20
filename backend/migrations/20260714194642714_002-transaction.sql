-- Up Migration


CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  userId UUID REFERENCES users(id), -- user_id is null for the default pre-defined categories 
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);


-- Personal Transactions will have NULL value for group_id. 
-- Group Transactions will have a non-NULL value for paid_by (since the group member posting the transaction may not have paid for it)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id),
  paidBy UUID REFERENCES users(id),
  groupId INTEGER, --for now not a foreign key, will update it later once group table is added
  categoryId UUID REFERENCES categories(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount DECIMAL(10,2) NOT NULL,
  transactionDate DATE NOT NULL,
  description VARCHAR(255),
  isRecurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurringInterval VARCHAR(20) CHECK (recurringInterval IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT validTransactionType CHECK (
    -- paid_by can only be null if group_id is null, make paid_by required for group and not allowed for personal
    (groupId IS NULL AND paidBy IS NULL) OR
    (grouId IS NOT NULL AND paidBy IS NOT NULL)
  )
);

--this table holds entries that map a user's individual contribution  to a group transaction.
--example: if a group splits a transaction 3 ways, then 3 rows in this table are created, one per group member
CREATE TABLE transactionSplits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transactionId UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL
);

-- Down Migration

DROP TABLE IF EXISTS transactionSplits;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;