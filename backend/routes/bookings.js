const express = require('express');
const db = require('../db/db');
const { addBookingToGoogleCalendar } = require('../db/googleCalendar');
const { getWorkSettings } = require('../db/db');

const router = express.Router();

// POST /api/bookings
router.post('/', (req, res) => {
  const { date, time, endTime, type, cost, email } = req.body;
  if (!date || !time || !type || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // If booking is free, check if user has already used a free session
  if (type === 'free') {
    db.get('SELECT * FROM bookings WHERE email = ? AND type = "free"', [email], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(403).json({ error: 'User has already used free consultation' });
      }
      insertBooking();
    });
  } else {
    insertBooking();
  }

  async function insertBooking() {
    const createdAt = new Date().toISOString();
    // For free consultations, automatically mark as paid
    const paid = type === 'free' ? 1 : 0;
    const insertSql = `INSERT INTO bookings (date, time, endTime, type, cost, email, createdAt, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(insertSql, [date, time, endTime, type, cost, email, createdAt, paid], async function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      const booking = { id: this.lastID, date, time, endTime, type, cost, email, createdAt };
      
      // For free consultations, immediately add to Google Calendar
      if (type === 'free') {
        const meetLink = await addBookingToGoogleCalendar(booking);
        if (meetLink) {
          db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, this.lastID]);
          booking.meet_link = meetLink;
        }
      }
      
      res.status(201).json({ message: 'Booking received', booking });
    });
  }
});

// GET /api/bookings
router.get('/', (req, res) => {
  // Use a single query with a condition to handle both admin and user cases
  const query = req.user?.role === 'admin'
    ? 'SELECT * FROM bookings ORDER BY date DESC, time DESC'
    : 'SELECT * FROM bookings WHERE email = ? ORDER BY date DESC, time DESC';
  
  const params = req.user?.role === 'admin' ? [] : [req.user?.email || ''];
  console.log('Query:', { sql: query, params, userRole: req.user?.role });

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: { bookings: rows } });
  });
});

// PATCH /api/bookings/:id/mark-paid
router.patch('/:id/mark-paid', async (req, res) => {
  const bookingId = req.params.id;
  db.run('UPDATE bookings SET paid = 1 WHERE id = ?', [bookingId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    // Fetch the booking and sync to Google Calendar
    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (err, booking) => {
      if (!err && booking) {
        const meetLink = await addBookingToGoogleCalendar(booking);
        if (meetLink) {
          db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, bookingId]);
        }
      }
    });
    res.json({ message: 'Booking marked as paid', id: bookingId });
  });
});

// GET /api/bookings/availability
router.get('/availability', (req, res) => {
  getWorkSettings((err, settings) => {
    db.all('SELECT * FROM bookings', [], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ error: 'Database error' });
      }
      const { workDays, workStart, workEnd, bufferMinutes } = settings;
      // Build a map of unavailable slots by date
      const unavailable = {};
      rows.forEach(booking => {
        const date = booking.date;
        if (!unavailable[date]) unavailable[date] = [];
        // Parse start and end times
        const timeMatch = booking.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return;
        let [ , startHour, startMin, ampm ] = timeMatch;
        let start = parseInt(startHour, 10);
        if (ampm.toUpperCase() === 'PM' && start !== 12) start += 12;
        if (ampm.toUpperCase() === 'AM' && start === 12) start = 0;
        let end = start + (booking.type === 'free' ? 0.5 : 1);
        if (booking.endTime) {
          const endMatch = booking.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (endMatch) {
            let [ , endHour, endMin, endAmpm ] = endMatch;
            end = parseInt(endHour, 10);
            if (endAmpm.toUpperCase() === 'PM' && end !== 12) end += 12;
            if (endAmpm.toUpperCase() === 'AM' && end === 12) end = 0;
          }
        }
        // Mark the slot and buffer after as unavailable
        const bufferHours = bufferMinutes / 60;
        unavailable[date].push({
          from: start,
          to: (booking.endTime ? end : start + (booking.type === 'free' ? 0.5 : 1)) + bufferHours
        });
      });
      res.json({ unavailable, workDays, workStart, workEnd, bufferMinutes });
    });
  });
});

module.exports = router;
