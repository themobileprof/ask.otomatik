const request = require('supertest');
const { app } = require('../app');
const { db } = require('../db/db');
const jwt = require('jsonwebtoken');

describe('Admin Routes', () => {
  let adminToken;
  let userToken;

  beforeAll(() => {
    // Create tokens for testing
    adminToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
    userToken = jwt.sign({ id: 2, email: 'user@test.com', role: 'user' }, process.env.JWT_SECRET || 'test-secret');
  });

  beforeEach(async () => {
    // Clear and seed the database before each test
    await new Promise((resolve) => {
      db.run('DELETE FROM bookings', [], (err) => {
        if (err) console.error('Error clearing bookings:', err);
        resolve();
      });
    });

    await new Promise((resolve) => {
      db.run('DELETE FROM users', [], (err) => {
        if (err) console.error('Error clearing users:', err);
        resolve();
      });
    });

    // Insert test data
    await new Promise((resolve) => {
      db.run(`
        INSERT INTO users (email, name, role) VALUES 
        ('admin@test.com', 'Admin', 'admin'),
        ('user@test.com', 'User', 'user')
      `, [], (err) => {
        if (err) console.error('Error inserting users:', err);
        resolve();
      });
    });

    // Insert test bookings
    await new Promise((resolve) => {
      db.run(`
        INSERT INTO bookings (date, time, endTime, type, email, status, cost) VALUES 
        ('2024-03-20', '10:00 AM', '11:00 AM', 'paid', 'user@test.com', 'confirmed', '$50'),
        ('2024-03-21', '2:00 PM', '3:00 PM', 'free', 'user@test.com', 'cancelled', '$0'),
        ('2024-03-22', '3:00 PM', '4:00 PM', 'paid', 'user@test.com', 'cancelled', '$50'),
        ('2024-04-01', '1:00 PM', '2:00 PM', 'paid', 'user@test.com', 'confirmed', '$50')
      `, [], (err) => {
        if (err) console.error('Error inserting bookings:', err);
        resolve();
      });
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should return stats for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        totalBookings: 4,
        totalPaidBookings: 3,
        totalFreeBookings: 1,
        totalRevenue: 100, // $50 + $50 (cancelled bookings included in total)
        totalUsers: 2
      });

      // Check booking lists
      expect(response.body.upcomingBookings).toHaveLength(1); // Only future non-cancelled
      expect(response.body.cancelledBookings).toHaveLength(2); // All cancelled regardless of date
      expect(response.body.recentBookings).toHaveLength(2); // Past non-cancelled

      // Verify cancelled bookings don't appear in other lists
      expect(response.body.upcomingBookings.every(b => b.status !== 'cancelled')).toBe(true);
      expect(response.body.recentBookings.every(b => b.status !== 'cancelled')).toBe(true);
      expect(response.body.cancelledBookings.every(b => b.status === 'cancelled')).toBe(true);
    });

    it('should properly sort bookings by date', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Check upcoming bookings are sorted by date ascending
      const upcomingDates = response.body.upcomingBookings.map(b => b.date);
      expect(upcomingDates).toEqual([...upcomingDates].sort());

      // Check cancelled and recent bookings are sorted by date descending
      const cancelledDates = response.body.cancelledBookings.map(b => b.date);
      const recentDates = response.body.recentBookings.map(b => b.date);
      expect(cancelledDates).toEqual([...cancelledDates].sort().reverse());
      expect(recentDates).toEqual([...recentDates].sort().reverse());
    });
  });
}); 