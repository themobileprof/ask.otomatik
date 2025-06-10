const express = require('express');
const { db, getWorkSettings } = require('../db/db');
const { addBookingToGoogleCalendar } = require('../db/googleCalendar');
const { authenticateJWT } = require('./auth-middleware');

const router = express.Router();

// Public routes (no authentication required)
// GET /api/bookings/availability
router.get('/availability', (req, res) => {
  getWorkSettings((err, settings) => {
    if (err) {
      console.error('Failed to get work settings:', err);
      return res.status(500).json({ error: 'Unable to retrieve availability' });
    }

    db.all('SELECT * FROM bookings', [], (err2, rows) => {
      if (err2) {
        console.error('Database error fetching bookings:', err2);
        return res.status(500).json({ error: 'Unable to retrieve availability' });
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

// Protected routes (authentication required)
router.use(authenticateJWT);

// POST /api/bookings
router.post('/', (req, res) => {
  const { date, time, endTime, type, cost } = req.body;
  
  // Validate required fields
  if (!date || !time || !type) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  // Validate booking type
  if (type !== 'free' && type !== 'paid') {
    return res.status(400).json({ error: 'Invalid booking type' });
  }

  // Always use the authenticated user's email
  const email = req.user.email;

  // If booking is free, check if user has already used a free session
  if (type === 'free') {
    db.get('SELECT * FROM bookings WHERE email = ? AND type = "free"', [email], (err, row) => {
      if (err) {
        console.error('Database error checking free session:', err);
        return res.status(500).json({ error: 'Unable to process booking' });
      }
      if (row) {
        return res.status(403).json({ error: 'Free consultation already used' });
      }
      insertBooking();
    });
  } else {
    insertBooking();
  }

  async function insertBooking() {
    // Check if the slot is available
    db.all('SELECT * FROM bookings WHERE date = ? AND time = ?', [date, time], (err, rows) => {
      if (err) {
        console.error('Database error checking slot availability:', err);
        return res.status(500).json({ error: 'Unable to process booking' });
      }

      if (rows.length > 0) {
        return res.status(409).json({ error: 'Selected time slot is not available' });
      }

      const createdAt = new Date().toISOString();
      // For free consultations, automatically mark as paid
      const paid = type === 'free' ? 1 : 0;
      const insertSql = `INSERT INTO bookings (date, time, endTime, type, cost, email, createdAt, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(insertSql, [date, time, endTime, type, cost, email, createdAt, paid], async function(err) {
        if (err) {
          console.error('Database error inserting booking:', err);
          return res.status(500).json({ error: 'Unable to create booking' });
        }

        const booking = { 
          id: this.lastID, 
          date, 
          time, 
          endTime, 
          type, 
          cost, 
          email, 
          createdAt,
          paid 
        };
        
        // For free consultations, immediately add to Google Calendar
        if (type === 'free') {
          try {
            const meetLink = await addBookingToGoogleCalendar(booking);
            if (meetLink) {
              db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, this.lastID]);
              booking.meet_link = meetLink;
            }
          } catch (error) {
            console.error('Failed to add booking to Google Calendar:', error);
            // Don't fail the booking creation if calendar fails, but include a warning
            return res.status(201).json({ 
              message: 'Booking confirmed',
              booking,
              warning: 'Calendar invitation will be sent separately'
            });
          }
        }
        
        res.status(201).json({ message: 'Booking confirmed', booking });
      });
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

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error fetching bookings:', err);
      return res.status(500).json({ error: 'Unable to retrieve bookings' });
    }
    res.json({ data: { bookings: rows } });
  });
});

// PATCH /api/bookings/:id/mark-paid
router.patch('/:id/mark-paid', async (req, res) => {
  const bookingId = req.params.id;
  
  // First check if the booking exists
  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      console.error('Database error checking booking:', err);
      return res.status(500).json({ error: 'Unable to process payment' });
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.paid) {
      return res.status(409).json({ error: 'Booking is already paid' });
    }

    db.run('UPDATE bookings SET paid = 1 WHERE id = ?', [bookingId], async function(err) {
      if (err) {
        console.error('Database error marking booking as paid:', err);
        return res.status(500).json({ error: 'Unable to process payment' });
      }

      try {
        const meetLink = await addBookingToGoogleCalendar(booking);
        if (meetLink) {
          db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, bookingId]);
          booking.meet_link = meetLink;
        }
      } catch (error) {
        console.error('Failed to add booking to Google Calendar:', error);
        return res.json({ 
          message: 'Payment confirmed',
          id: bookingId,
          warning: 'Calendar invitation will be sent separately'
        });
      }

      res.json({ 
        message: 'Payment confirmed',
        id: bookingId
      });
    });
  });
});

module.exports = router;
