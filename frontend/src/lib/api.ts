import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Types
export type BookingType = 'free' | 'paid';

export interface Booking {
  id: number;
  date: string;
  time: string;
  endTime?: string;
  type: BookingType;
  cost: string;
  email: string;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
}

export interface TimeSlot {
  from: number;
  to: number;
}

export interface AvailabilityResponse {
  unavailable: Record<string, TimeSlot[]>;
  workDays: number[];
  workStart: number;
  workEnd: number;
  bufferMinutes: number;
}

interface AuthResponse {
  token: string;
  user: User;
}

// API Client
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  async get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }

  // Auth Endpoints
  async checkSession() {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }
    return this.get<{ user: User }>('/auth/session');
  }

  async googleSignIn(credential: string) {
    return this.post<AuthResponse>('/auth/google', { credential });
  }

  async signOut() {
    return this.post('/auth/logout', {});
  }

  // Booking Endpoints
  async createBooking(data: any) {
    const response = await this.post('/api/bookings', data);
    return response.data;
  }

  async getBookings() {
    const response = await this.get('/api/bookings');
    return response.data;
  }

  async getAvailability() {
    const response = await this.get('/api/bookings/availability');
    return response.data;
  }

  // Payment Endpoints
  async initiatePayment(data: any) {
    const response = await this.post('/api/payment/flutterwave/initiate', data);
    return response.data;
  }

  async verifyPayment(transactionId: string, bookingData: any) {
    const response = await this.post('/api/payment/flutterwave/verify', {
      transaction_id: transactionId,
      booking_data: bookingData,
    });
    return response.data;
  }

  // Admin Endpoints
  async getUsers() {
    const response = await this.get('/api/admin/users');
    return response.data;
  }

  async updateUserRole(userId: number, role: 'user' | 'admin') {
    const response = await this.put('/api/admin/users/' + userId + '/role', { role });
    return response.data;
  }

  async getSettings() {
    const response = await this.get('/api/admin/settings');
    return response.data;
  }

  async updateSettings(data: {
    workDays: number[];
    workStart: number;
    workEnd: number;
    bufferMinutes: number;
  }) {
    const response = await this.put('/api/admin/settings', data);
    return response.data;
  }

  async getStats() {
    const response = await this.get('/api/admin/stats');
    return response.data;
  }
}

export const api = new ApiClient(); 