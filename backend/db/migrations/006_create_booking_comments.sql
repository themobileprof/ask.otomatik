-- Booking comments table
CREATE TABLE IF NOT EXISTS booking_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_booking_comments_booking_id ON booking_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_comments_user_id ON booking_comments(user_id); 