# Consult Backend

This is a simple Node.js/Express backend for handling bookings from your React frontend.

## Features
- POST /api/bookings: Accepts booking data (date, time, type, etc) and stores it in memory.
- CORS enabled for local development.
- Ready for future email or database integration.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node index.js
   ```
3. The API will be available at http://localhost:4000

## API Endpoints

### POST /api/bookings
- Body: `{ date, time, endTime, type, cost }`
- Returns: Confirmation and booking data

### GET /api/bookings
- Returns all bookings (for testing)

---

Feel free to extend this backend with email notifications or database storage as needed.
