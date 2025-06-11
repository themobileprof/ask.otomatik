const express = require('express');
const axios = require('axios');
const { addBookingToGoogleCalendar } = require('../db/googleCalendar');
const { db } = require('../db/db');
const { authenticateJWT } = require('./auth-middleware');

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

// POST /api/payment/flutterwave/initiate
router.post('/flutterwave/initiate', async (req, res) => {
  const { amount, email, name, tx_ref, redirect_url, use_wallet } = req.body;
  if (!amount || !email || !name || !tx_ref || !redirect_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // If using wallet, check balance first
  if (use_wallet) {
    try {
      const wallet = await getWalletByUserId(req.user.id);
      if (!wallet || wallet.balance < amount) {
        return res.status(400).json({ 
          error: 'Insufficient wallet balance',
          wallet_balance: wallet ? wallet.balance : 0
        });
      }
      // Return success with wallet info for frontend to handle
      return res.json({
        payment_type: 'wallet',
        wallet_balance: wallet.balance,
        amount: amount
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to check wallet balance' });
    }
  }

  // Proceed with Flutterwave payment if not using wallet
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
router.post('/flutterwave/verify', authenticateJWT, async (req, res) => {
  console.log('Payment verification received:', req.body);
  const { transaction_id, booking_data, payment_type } = req.body;
  
  if (!transaction_id) {
    return res.status(400).json({ error: 'Missing transaction_id' });
  }

  try {
    // Verify the transaction with Flutterwave
    if (!process.env.FLW_SECRET_KEY) {
      console.error('FLW_SECRET_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'Payment verification configuration error',
        details: 'Missing Flutterwave secret key'
      });
    }

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
    
    if (response.data.status === 'success' && response.data.data.status === 'successful') {
      const amount = response.data.data.amount;
      const tx_ref = response.data.data.tx_ref;

      // Handle wallet top-up
      if (payment_type === 'wallet' && tx_ref.startsWith('wallet_topup_')) {
        // Get or create wallet
        let wallet = await getWalletByUserId(req.user.id);
        if (!wallet) {
          const now = new Date().toISOString();
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, 0, ?, ?)',
              [req.user.id, now, now],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });
          wallet = await getWalletByUserId(req.user.id);
        }

        // Create transaction record
        await new Promise((resolve, reject) => {
          const now = new Date().toISOString();
          db.run(
            'INSERT INTO wallet_transactions (wallet_id, amount, type, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [wallet.id, amount, 'credit', 'Wallet top-up via Flutterwave', req.user.id, now],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // Update wallet balance
        await new Promise((resolve, reject) => {
          const now = new Date().toISOString();
          db.run(
            'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
            [amount, now, wallet.id],
            function(err) {
              if (err) reject(err);
              else resolve(this.changes);
            }
          );
        });

        return res.json({
          message: 'Wallet top-up successful',
          status: 'success'
        });
      }

      // Handle booking payment (existing code)
      if (!booking_data) {
        return res.status(400).json({ error: 'Missing booking data' });
      }

      // If this is a free booking, check if user has already used their free consultation
      if (booking_data.type === 'free') {
        const existingFreeBooking = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM bookings WHERE email = ? AND type = "free"', [booking_data.email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (existingFreeBooking) {
          console.error('User has already used free consultation:', booking_data.email);
          return res.status(403).json({ error: 'Free consultation already used' });
        }
      }

      // Step 1: Create booking (always unpaid initially)
      console.log('Creating booking with data:', booking_data);
        const createdAt = new Date().toISOString();
        const insertSql = `INSERT INTO bookings (date, time, endTime, type, email, createdAt, paid, cost) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
      const booking = await new Promise((resolve, reject) => {
        db.run(insertSql, [
          booking_data.date,
          booking_data.time,
          booking_data.endTime,
          booking_data.type,
          booking_data.email,
          createdAt,
          0, // always start as unpaid
          booking_data.type === 'free' ? '0' : booking_data.cost || '0' // store cost
        ], function(err) {
          if (err) {
            console.error('Error creating booking:', err);
            reject(err);
            return;
          }
          
          resolve({
            id: this.lastID,
            ...booking_data,
            paid: 0,
            cost: booking_data.type === 'free' ? '0' : booking_data.cost || '0'
          });
        });
      });

      // Step 2: Handle payment verification based on payment type
      let paymentVerified = false;

      if (booking_data.type === 'free') {
        // For free bookings, mark as paid automatically
        paymentVerified = true;
      } else if (payment_type === 'wallet') {
        // For wallet payments, process the wallet transaction
        try {
          const wallet = await getWalletByUserId(req.user.id);
          if (!wallet || wallet.balance < booking_data.cost) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
          }

          // Create wallet transaction
          await new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            db.run(
              'INSERT INTO wallet_transactions (wallet_id, amount, type, description, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [wallet.id, booking_data.cost, 'debit', `Payment for booking #${booking.id}`, req.user.id, now],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          // Update wallet balance
          await new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            db.run(
              'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE id = ?',
              [booking_data.cost, now, wallet.id],
              function(err) {
                if (err) reject(err);
                else resolve(this.changes);
              }
            );
          });

          paymentVerified = true;
        } catch (err) {
          console.error('Wallet payment failed:', err);
          return res.status(500).json({ error: 'Failed to process wallet payment' });
        }
      } else {
        // For Flutterwave payments, verify with their API
        paymentVerified = response.data.status === 'success' && response.data.data.status === 'successful';
      }

      // Step 3: If payment verified, mark as paid and add to calendar
      if (paymentVerified) {
        // Mark as paid
        await new Promise((resolve, reject) => {
          db.run('UPDATE bookings SET paid = 1 WHERE id = ?', [booking.id], (err) => {
            if (err) {
              console.error('Error marking booking as paid:', err);
              reject(err);
              return;
            }
            resolve();
          });
        });
        
        booking.paid = 1;
          
          // Add to Google Calendar
        try {
          const meetLink = await addBookingToGoogleCalendar(booking);
          if (meetLink) {
            console.log('Added to calendar, meet link:', meetLink);
            await new Promise((resolve, reject) => {
              db.run('UPDATE bookings SET meet_link = ? WHERE id = ?', [meetLink, booking.id], (err) => {
                if (err) {
                  console.error('Error updating meet link:', err);
                  reject(err);
                  return;
                }
                resolve();
              });
            });
            booking.meet_link = meetLink;
          }
        } catch (calendarError) {
          console.error('Failed to add to calendar:', calendarError);
          // Don't fail the whole request if calendar fails
          return res.json({
            message: 'Booking confirmed',
            booking: booking,
            warning: 'Calendar invitation will be sent separately'
          });
        }

        return res.json({
          message: 'Booking confirmed',
          booking: booking
        });
      }

      // Step 4: If we get here, payment failed
      console.log('Payment not successful');
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: 'Payment status is not successful',
        booking: booking // Include the unpaid booking in the response
      });

    } else {
      throw new Error('Payment verification failed');
    }
  } catch (err) {
    console.error('Payment verification failed:', err);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: err.message
    });
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
