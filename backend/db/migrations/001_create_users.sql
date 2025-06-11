-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  createdAt TEXT NOT NULL
);

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); 