require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Add environment variable verification logging
console.log('Environment Check:');
console.log('- FLW_SECRET_KEY:', process.env.FLW_SECRET_KEY ? 'Present (starts with: ' + process.env.FLW_SECRET_KEY.substring(0, 8) + '...)' : 'Missing');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

const bookingsRouter = require('./routes/bookings');
const authRouter = require('./routes/auth');
const paymentRouter = require('./routes/payment');
const adminRouter = require('./routes/admin');
const walletRouter = require('./routes/wallet');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://ask.otomatiktech.com']
    : ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  // Allow cross-origin popups (needed for Google Sign-In)
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json());

// API routes
app.use('/auth', authRouter); // Remove /api prefix for auth routes
app.use('/api/bookings', bookingsRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/wallet', walletRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
