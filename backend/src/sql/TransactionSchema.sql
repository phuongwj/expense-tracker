
--- Note: users, groups, and group_members tables are temporary and will be replaced w. Phuong's implementation
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  leader_id INTEGER NOT NULL REFERENCES users(id),
  invite_code VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE group_members (
  user_id INTEGER NOT NULL REFERENCES users(id),
  group_id INTEGER NOT NULL REFERENCES groups(id),
  PRIMARY KEY (user_id, group_id)
);

-- for authentication, if user needs to reset their password
-- this table stores the user's id and a token (with expiry) they can use to reset pw
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL
);


-- Transaction related tables: 

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id), -- user_id only null for the default pre-defined categories 
  UNIQUE (user_id, name)
);

-- Personal Transactions will have NULL value for group_id. 
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  group_id INTEGER REFERENCES groups(id),
  category_id INTEGER REFERENCES categories(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255),
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_interval VARCHAR(20) CHECK (recurring_interval IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly'))
);

--this table holds entries that map a user's individual contribution  to a group transaction.
--example: if a group splits a transaction 3 ways, then 3 rows in this table are created, one per group member
CREATE TABLE transaction_splits (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL
);