const express = require('express');
const db = require('../db/db');
const { getWorkSettings } = require('../db/db');
const { authenticateJWT } = require('./auth-middleware');

const router = express.Router();

// Middleware: check if user is admin (assumes req.user is set by auth middleware)
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Use authenticateJWT for all admin routes
router.use(authenticateJWT);

// GET /api/admin/users - List all users
router.get('/users', requireAdmin, (req, res) => {
  db.all('SELECT id, email, name, picture, role, createdAt FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// PATCH /api/admin/users/:id/role - Change user role
router.patch('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;
  if (!role) return res.status(400).json({ error: 'Missing role' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User role updated', id: userId, role });
  });
});

// GET /api/admin/settings - Get work settings
router.get('/settings', requireAdmin, (req, res) => {
  getWorkSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(settings);
  });
});

// PATCH /api/admin/settings - Update work settings
router.patch('/settings', requireAdmin, (req, res) => {
  const { workDays, workStart, workEnd, bufferMinutes } = req.body;
  db.run(
    'INSERT INTO settings (workDays, workStart, workEnd, bufferMinutes) VALUES (?, ?, ?, ?)',
    [workDays.join(','), workStart, workEnd, bufferMinutes],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Settings updated', id: this.lastID });
    }
  );
});

// GET /api/admin/stats - Get booking statistics
router.get('/stats', requireAdmin, (req, res) => {
  const queries = {
    totalBookings: 'SELECT COUNT(*) as count FROM bookings',
    totalPaidBookings: "SELECT COUNT(*) as count FROM bookings WHERE type = 'paid'",
    totalFreeBookings: "SELECT COUNT(*) as count FROM bookings WHERE type = 'free'",
    totalRevenue: "SELECT SUM(CAST(REPLACE(REPLACE(cost, '$', ''), ',', '') AS DECIMAL)) as total FROM bookings WHERE type = 'paid'",
    recentBookings: `
      SELECT b.*, u.name as userName, u.picture as userPicture 
      FROM bookings b 
      LEFT JOIN users u ON b.email = u.email 
      ORDER BY b.createdAt DESC LIMIT 5
    `,
    upcomingBookings: `
      SELECT b.*, u.name as userName, u.picture as userPicture 
      FROM bookings b 
      LEFT JOIN users u ON b.email = u.email 
      WHERE date >= date('now') 
      ORDER BY date ASC, time ASC LIMIT 5
    `,
    bookingsByType: 'SELECT type, COUNT(*) as count FROM bookings GROUP BY type',
    totalUsers: 'SELECT COUNT(*) as count FROM users'
  };

  const stats = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  // Execute each query
  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'recentBookings' || key === 'upcomingBookings' || key === 'bookingsByType') {
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error(`Error in ${key} query:`, err);
          stats[key] = [];
        } else {
          stats[key] = rows;
        }
        completed++;
        if (completed === totalQueries) {
          res.json(stats);
        }
      });
    } else {
      db.get(query, [], (err, row) => {
        if (err) {
          console.error(`Error in ${key} query:`, err);
          stats[key] = 0;
        } else {
          stats[key] = row.count || row.total || 0;
        }
        completed++;
        if (completed === totalQueries) {
          res.json(stats);
        }
      });
    }
  });
});

module.exports = router;
