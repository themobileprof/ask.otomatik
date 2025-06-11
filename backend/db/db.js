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

  // Run migrations
  runMigrations();
});

// Function to run migrations
function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Create migrations table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating migrations table:', err);
      return;
    }

    // Get list of migration files
    fs.readdir(migrationsDir, (err, files) => {
      if (err) {
        console.error('Error reading migrations directory:', err);
        return;
      }

      // Filter for .sql files and sort them
      const migrations = files
        .filter(f => f.endsWith('.sql'))
        .sort();

      // Get already applied migrations
      db.all('SELECT name FROM migrations', [], (err, applied) => {
        if (err) {
          console.error('Error checking applied migrations:', err);
          return;
        }

        const appliedMigrations = new Set(applied.map(m => m.name));

        // Run each migration that hasn't been applied yet
        migrations.forEach(migration => {
          if (!appliedMigrations.has(migration)) {
            const migrationPath = path.join(migrationsDir, migration);
            const sql = fs.readFileSync(migrationPath, 'utf8');

            db.serialize(() => {
              db.exec('BEGIN TRANSACTION');

              try {
                // Run the migration
                db.exec(sql);

                // Record the migration
                db.run(
                  'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
                  [migration, new Date().toISOString()]
                );

                db.exec('COMMIT');
                console.log(`Applied migration: ${migration}`);
              } catch (err) {
                db.exec('ROLLBACK');
                console.error(`Error applying migration ${migration}:`, err);
              }
            });
          }
        });
      });
    });
  });
}

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
