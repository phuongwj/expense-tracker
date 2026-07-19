-- Up Migration


CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id), -- user_id is null for the default pre-defined categories 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);


-- Personal Transactions will have NULL value for group_id. 
-- Group Transactions will have a non-NULL value for paid_by (since the group member posting the transaction may not have paid for it)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  paid_by UUID REFERENCES users(id),
  group_id INTEGER, --for now not a foreign key, will update it later once group table is added
  category_id UUID REFERENCES categories(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255),
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_interval VARCHAR(20) CHECK (recurring_interval IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (
    -- paid_by can only be null if group_id is null, make paid_by required for group and not allowed for personal
    (group_id IS NULL AND paid_by IS NULL) OR
    (group_id IS NOT NULL AND paid_by IS NOT NULL)
  )
);

--this table holds entries that map a user's individual contribution  to a group transaction.
--example: if a group splits a transaction 3 ways, then 3 rows in this table are created, one per group member
CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL
);

-- Down Migration

DROP TABLE IF EXISTS transaction_splits;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;