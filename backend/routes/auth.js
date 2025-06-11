const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { db } = require('../db/db');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware to check authentication
const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /auth/session - Check current session
router.get('/session', checkAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/google - Google Sign In
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Define admin emails
    const adminEmails = ['themobileprof@gmail.com', 'themobileprof.com@gmail.com'];
    const isAdmin = adminEmails.includes(payload.email);

    // Store or update user
    const user = await new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
      // Include role in INSERT
    db.run(
        'INSERT OR IGNORE INTO users (email, name, picture, role, createdAt) VALUES (?, ?, ?, ?, ?)',
        [payload.email, payload.name, payload.picture, isAdmin ? 'admin' : 'user', createdAt],
        function(err) {
          if (err) reject(err);
          // If user already exists, update their role if they're an admin
          if (isAdmin) {
            db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', payload.email]);
          }
          db.get('SELECT * FROM users WHERE email = ?', [payload.email], (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
      }
    );
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// POST /auth/logout - Sign out (client-side only for JWT)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
