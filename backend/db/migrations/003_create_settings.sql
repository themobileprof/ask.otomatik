-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workDays TEXT DEFAULT '1,2,3,4,5',
  workStart INTEGER DEFAULT 9,
  workEnd INTEGER DEFAULT 17,
  bufferMinutes INTEGER DEFAULT 60
);

-- Insert default settings if table is empty
INSERT OR IGNORE INTO settings (id, workDays, workStart, workEnd, bufferMinutes)
VALUES (1, '1,2,3,4,5', 9, 17, 60); 