const express = require('express');
const axios = require('axios');
const { addBookingToGoogleCalendar } = require('../db/googleCalendar');
const db = require('../db/db');

const router = express.Router();

// POST /api/payment/flutterwave/initiate
router.post('/initiate', async (req, res) => {
  const { amount, email, name, tx_ref, redirect_url } = req.body;
  if (!amount || !email || !name || !tx_ref || !redirect_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref,
        amount,
        currency: 'USD',
        redirect_url,
        customer: { email, name },
        payment_options: 'card',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Flutterwave payment initiation failed', details: err.response?.data || err.message });
  }
});

// POST /api/payment/flutterwave/verify
router.post('/verify', async (req, res) => {
  console.log('Payment verification received:', req.body);
  const { transaction_id, booking_data } = req.body;
  if (!transaction_id) {
    console.log('Missing transaction_id');
    return res.status(400).json({ error: 'Missing transaction_id' });
  }
  try {
    console.log('Verifying transaction:', transaction_id);
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );
    console.log('Verification response:', response.data);
    
    // If payment is successful, create/update booking
    if (response.data.status === 'success' && response.data.data.status === 'successful') {
      const tx_ref = response.data.data.tx_ref;
      console.log('Payment successful, tx_ref:', tx_ref);
      
      if (booking_data) {
        console.log('Creating/updating booking with data:', booking_data);
        const createdAt = new Date().toISOString();
        const insertSql = `INSERT INTO bookings (date, time, endTime, type, email, createdAt, paid, cost) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(insertSql, [
          booking_data.date,
          booking_data.time,
          booking_data.endTime,
          booking_data.type,
          booking_data.email,
          createdAt,
          1, // mark as paid
          response.data.data.amount.toString() // store the actual amount paid
        ], async function(err) {
          if (err) {
            console.error('Error creating booking:', err);
            return res.status(500).json({ error: 'Failed to create booking' });
          }
          
          const booking = {
            id: this.lastID,
            ...booking_data,
            paid: 1,
            cost: response.data.data.amount.toString()
          };
          
          console.log('Created booking:', booking);
          
          // Add to Google Calendar
          const meetLink = await addBookingToGoogleCalendar(booking);
          if (meetLink) {
            console.log('Added to calendar, meet link:', meetLink);
            db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, this.lastID]);
            booking.meet_link = meetLink;
          }
          
          res.json({
            ...response.data,
            booking: booking
          });
        });
      } else {
        res.json(response.data);
      }
    } else {
      res.json(response.data);
    }
  } catch (err) {
    console.error('Payment verification error:', err.message, err.response?.data);
    res.status(500).json({ error: 'Flutterwave verification failed', details: err.response?.data || err.message });
  }
});

// Flutterwave Webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('Webhook received:', req.headers, req.body.toString());
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = req.headers['verif-hash'];
  if (!signature || signature !== secretHash) {
    console.log('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  let event;
  try {
    event = JSON.parse(req.body.toString());
    console.log('Webhook event:', event);
  } catch (e) {
    console.error('Invalid webhook JSON:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  // Handle payment event (e.g., update booking/payment status)
  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    console.log('Payment successful event received');
    // Find booking by tx_ref and mark as paid
    const tx_ref = event.data.tx_ref;
    const amount = event.data.amount;
    const email = event.data.customer?.email;
    
    if (tx_ref) {
      console.log('Looking up booking for:', { amount, email });
      // First try to find by exact amount and email
      db.get('SELECT * FROM bookings WHERE cost = ? AND email = ? AND paid = 0 ORDER BY createdAt DESC LIMIT 1', 
        [amount, email], async (err, booking) => {
          console.log('Booking lookup result:', booking, 'Error:', err);
          if (!err && booking) {
            console.log('Marking booking as paid:', booking.id);
            db.run('UPDATE bookings SET paid = 1 WHERE id = ?', [booking.id]);
            const meetLink = await addBookingToGoogleCalendar(booking);
            if (meetLink) {
              console.log('Added to calendar, meet link:', meetLink);
              db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, booking.id]);
            }
          } else {
            console.log('No matching booking found or error occurred');
          }
      });
    }
  }
  res.status(200).json({ status: 'success' });
});

module.exports = router;
