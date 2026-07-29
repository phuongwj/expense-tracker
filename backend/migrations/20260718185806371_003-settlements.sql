-- Up Migration
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  paid_by UUID NOT NULL REFERENCES users(id),
  paid_to UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settlement_users_differ CHECK (paid_by <> paid_to)
);
-- Down Migration

DROP TABLE IF EXISTS settlements;