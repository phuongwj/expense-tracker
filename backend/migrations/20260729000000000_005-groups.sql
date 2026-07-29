-- Up Migration

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  join_code VARCHAR(8) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(10) NOT NULL CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON group_members (user_id);
CREATE INDEX idx_group_members_group_id ON group_members (group_id);

ALTER TABLE transactions DROP COLUMN group_id;
ALTER TABLE transactions ADD COLUMN group_id UUID REFERENCES groups(id);

-- Down Migration

ALTER TABLE transactions DROP COLUMN group_id;
ALTER TABLE transactions ADD COLUMN group_id INTEGER;

DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
