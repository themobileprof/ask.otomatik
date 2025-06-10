const express = require('express');
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

// GET /api/wallet - Get user's wallet info
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let wallet = await getWalletByUserId(req.user.id);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      const now = new Date().toISOString();
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, 0.00, ?, ?)',
          [req.user.id, now, now],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      wallet = await getWalletByUserId(req.user.id);
    }

    // Get recent transactions
    const transactions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT wt.*, u.name as performed_by_name 
         FROM wallet_transactions wt 
         JOIN users u ON wt.performed_by = u.id 
         WHERE wallet_id = ? 
         ORDER BY created_at DESC LIMIT 10`,
        [wallet.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ wallet, transactions });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet information' });
  }
});

// POST /api/wallet/topup - Top up wallet (for Flutterwave integration)
router.post('/topup', authenticateJWT, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    let wallet = await getWalletByUserId(req.user.id);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Create transaction record
    await createWalletTransaction(
      wallet.id,
      amount,
      'credit',
      'Wallet top-up',
      req.user.id
    );

    // Update wallet balance
    await updateWalletBalance(wallet.id, amount, 'credit');

    // Get updated wallet
    wallet = await getWalletByUserId(req.user.id);
    
    res.json({ 
      message: 'Wallet topped up successfully',
      wallet 
    });
  } catch (error) {
    console.error('Wallet top-up error:', error);
    res.status(500).json({ error: 'Failed to top up wallet' });
  }
});

// POST /api/wallet/admin/topup - Admin top up user's wallet
router.post('/admin/topup', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { userId, amount, description } = req.body;
  if (!userId || !amount || amount <= 0 || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let wallet = await getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    // Create transaction record
    await createWalletTransaction(
      wallet.id,
      amount,
      'credit',
      description,
      req.user.id
    );

    // Update wallet balance
    await updateWalletBalance(wallet.id, amount, 'credit');

    // Get updated wallet
    wallet = await getWalletByUserId(userId);
    
    res.json({ 
      message: 'Wallet topped up successfully by admin',
      wallet 
    });
  } catch (error) {
    console.error('Admin wallet top-up error:', error);
    res.status(500).json({ error: 'Failed to top up wallet' });
  }
});

// POST /api/wallet/debit - Debit wallet (for booking payment)
router.post('/debit', authenticateJWT, async (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0 || !description) {
    return res.status(400).json({ error: 'Invalid amount or missing description' });
  }

  try {
    let wallet = await getWalletByUserId(req.user.id);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create transaction record
    await createWalletTransaction(
      wallet.id,
      amount,
      'debit',
      description,
      req.user.id
    );

    // Update wallet balance
    await updateWalletBalance(wallet.id, amount, 'debit');

    // Get updated wallet
    wallet = await getWalletByUserId(req.user.id);
    
    res.json({ 
      message: 'Payment successful',
      wallet 
    });
  } catch (error) {
    console.error('Wallet debit error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

module.exports = router; 