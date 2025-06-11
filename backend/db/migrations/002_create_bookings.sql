-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  endTime TEXT,
  type TEXT NOT NULL,
  cost TEXT,
  email TEXT,
  createdAt TEXT NOT NULL,
  paid INTEGER DEFAULT 0,
  meet_link TEXT
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_paid ON bookings(paid); 