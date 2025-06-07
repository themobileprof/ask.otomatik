const request = require('supertest');
const express = require('express');

const app = express();

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('Health Check Endpoint', () => {
  it('should return status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
}); 