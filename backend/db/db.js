const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Use existing bookings.db in backend directory
const dbPath = path.join(__dirname, '..', 'bookings.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database at:', dbPath);
});

// Create bookings table if it doesn't exist
const createBookingsTableSql = `
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
)`;
db.run(createBookingsTableSql);

// Create users table if it doesn't exist
const createUsersTableSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  role TEXT DEFAULT 'user',
  createdAt TEXT NOT NULL
)`;
db.run(createUsersTableSql);

// Create settings table if it doesn't exist
const createSettingsTableSql = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workDays TEXT DEFAULT '1,2,3,4,5',
  workStart INTEGER DEFAULT 9,
  workEnd INTEGER DEFAULT 17,
  bufferMinutes INTEGER DEFAULT 60
)`;
db.run(createSettingsTableSql);

// Helper to get workdays/hours/buffer from DB
function getWorkSettings(callback) {
  db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err || !row) {
      // Return default settings if no settings found
      callback(null, {
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        workStart: 9, // 9 AM
        workEnd: 17, // 5 PM
        bufferMinutes: 60 // 1 hour buffer between sessions
      });
    } else {
      callback(null, {
        workDays: row.workDays.split(',').map(Number),
        workStart: row.workStart,
        workEnd: row.workEnd,
        bufferMinutes: row.bufferMinutes
      });
    }
  });
}

module.exports = { db, getWorkSettings };
