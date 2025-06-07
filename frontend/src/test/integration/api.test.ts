import { describe, it, expect } from 'vitest';
import axios, { AxiosInstance } from 'axios';

describe('API Integration', () => {
  const api: AxiosInstance = axios.create({
    baseURL: 'http://localhost:4000',
  });

  it('should connect to the backend health check endpoint', async () => {
    const response = await api.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok' });
  });
}); 