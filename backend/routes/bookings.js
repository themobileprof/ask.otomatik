const express = require('express');
const { db, getWorkSettings } = require('../db/db');
const { addBookingToGoogleCalendar, deleteBookingFromGoogleCalendar } = require('../db/googleCalendar');
const { authenticateJWT } = require('./auth-middleware');
const { differenceInDays } = require('date-fns');

const router = express.Router();

// Helper function to get wallet by user_id
const getWalletByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM wallets WHERE user_id = ?', [userId], (err, wallet) => {
      if (err) reject(err);
      else resolve(wallet);
    });
  });
};

// Helper function to create a wallet transaction
const createWalletTransaction = (walletId, amount, type, description, performedBy) => {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
    db.run(
      'INSERT INTO wallet_transactions (wallet_id, amount, type, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [walletId, amount, type, description, performedBy, createdAt],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

// Helper function to update wallet balance
const updateWalletBalance = (walletId, amount, type) => {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date().toISOString();
    const operation = type === 'credit' ? '+' : '-';
    db.run(
      `UPDATE wallets SET balance = balance ${operation} ?, updated_at = ? WHERE id = ?`,
      [amount, updatedAt, walletId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

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

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticateJWT, async (req, res) => {
  const bookingId = req.params.id;
  
  try {
    // Get the booking
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if the booking belongs to the user or if user is admin
    if (booking.email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Check if booking is in the future
    const endTimeStr = booking.endTime || booking.time; // fallback to start time if no end time
    const [endTime, endPeriod] = endTimeStr.split(' ');
    const [endHours, endMinutes] = endTime.split(':');
    let endHour = parseInt(endHours);
    
    // Convert to 24-hour format
    if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod === 'AM' && endHour === 12) endHour = 0;
    
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(endHour, parseInt(endMinutes), 0);
    const currentDate = new Date();
    
    const daysUntilBooking = differenceInDays(bookingDate, currentDate);

    // Only allow cancellation if more than 7 days until the booking
    if (daysUntilBooking <= 7) {
      return res.status(400).json({ 
        error: 'Cannot cancel booking less than 7 days before the session' 
      });
    }

    // If it's a paid booking, process refund to wallet
    if (booking.type === 'paid' && booking.paid) {
      const cost = parseFloat(booking.cost);
      if (cost > 0) {
        // Get or create user's wallet
        let wallet = await getWalletByUserId(req.user.id);
        if (!wallet) {
          const timestamp = new Date().toISOString();
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, 0, ?, ?)',
              [req.user.id, timestamp, timestamp],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });
          wallet = await getWalletByUserId(req.user.id);
        }

        // Create refund transaction
        await createWalletTransaction(
          wallet.id,
          cost,
          'credit',
          `Refund for cancelled booking #${bookingId}`,
          req.user.id
        );

        // Update wallet balance
        await updateWalletBalance(wallet.id, cost, 'credit');
      }
    }

    // Delete from Google Calendar if event_id exists
    if (booking.event_id) {
      await deleteBookingFromGoogleCalendar(booking.event_id);
    }

    // Update booking status
    const cancelledAt = new Date().toISOString();
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE bookings SET status = ?, cancelled_at = ? WHERE id = ?',
        ['cancelled', cancelledAt, bookingId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({ 
      message: 'Booking cancelled successfully',
      refunded: booking.type === 'paid' && booking.paid
    });
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// GET /api/bookings/:id/comments
router.get('/:id/comments', authenticateJWT, async (req, res) => {
  const bookingId = req.params.id;

  try {
    // Get the booking first to check if it exists
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get comments with user information
    const comments = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          bc.*,
          u.name as user_name,
          u.picture as user_picture,
          u.role as user_role
        FROM booking_comments bc
        JOIN users u ON bc.user_id = u.id
        WHERE bc.booking_id = ?
        ORDER BY bc.created_at DESC
      `, [bookingId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ comments });
  } catch (error) {
    console.error('Failed to get booking comments:', error);
    res.status(500).json({ error: 'Failed to get booking comments' });
  }
});

// POST /api/bookings/:id/comments
router.post('/:id/comments', authenticateJWT, async (req, res) => {
  const bookingId = req.params.id;
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  try {
    // Get the booking first to check if it exists
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user is authorized to comment (must be the booking user or an admin)
    if (booking.email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to comment on this booking' });
    }

    // Check if user has already commented (only one comment per user)
    const existingComment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM booking_comments WHERE booking_id = ? AND user_id = ?', 
        [bookingId, req.user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
    });

    if (existingComment) {
      return res.status(400).json({ error: 'You have already commented on this booking' });
    }

    // Add the comment
    const createdAt = new Date().toISOString();
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO booking_comments (booking_id, user_id, comment, created_at) VALUES (?, ?, ?, ?)',
        [bookingId, req.user.id, comment, createdAt],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Get the created comment with user information
    const createdComment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          bc.*,
          u.name as user_name,
          u.picture as user_picture,
          u.role as user_role
        FROM booking_comments bc
        JOIN users u ON bc.user_id = u.id
        WHERE bc.id = ?
      `, [result], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json({ message: 'Comment added successfully', comment: createdComment });
  } catch (error) {
    console.error('Failed to add booking comment:', error);
    res.status(500).json({ error: 'Failed to add booking comment' });
  }
});

// PATCH /api/bookings/:id/comments/:commentId
router.patch('/:id/comments/:commentId', authenticateJWT, async (req, res) => {
  const { id: bookingId, commentId } = req.params;
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  try {
    // Get the comment to check ownership
    const existingComment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT bc.*, u.role as user_role 
        FROM booking_comments bc
        JOIN users u ON bc.user_id = u.id
        WHERE bc.id = ? AND bc.booking_id = ?
      `, [commentId, bookingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the comment or is admin
    if (existingComment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to edit this comment' });
    }

    // Update the comment
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE booking_comments SET comment = ? WHERE id = ?',
        [comment, commentId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Get the updated comment with user information
    const updatedComment = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          bc.*,
          u.name as user_name,
          u.picture as user_picture,
          u.role as user_role
        FROM booking_comments bc
        JOIN users u ON bc.user_id = u.id
        WHERE bc.id = ?
      `, [commentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({ message: 'Comment updated successfully', comment: updatedComment });
  } catch (error) {
    console.error('Failed to update comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

module.exports = router;
