const jwt = require('jsonwebtoken');
const { db } = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Express middleware to authenticate JWT and attach user (with role) to req.user
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth failed: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Auth failed: Token verification error:', err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Fetch user from DB to get role
    db.get('SELECT * FROM users WHERE email = ?', [decoded.email], (dbErr, user) => {
      if (dbErr) {
        console.log('Auth failed: Database error:', dbErr);
        return res.status(401).json({ error: 'User not found' });
      }
      if (!user) {
        console.log('Auth failed: User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }
      
      req.user = user;
      next();
    });
  });
}

module.exports = { authenticateJWT };
