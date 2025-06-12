-- Add status column to bookings table
ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled'));
ALTER TABLE bookings ADD COLUMN cancelled_at TEXT;
ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN event_id TEXT; -- Store Google Calendar event ID
 
-- Add index for status
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status); 