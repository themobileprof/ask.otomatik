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
  meet_link?: string;
  paid: boolean;
  status: 'confirmed' | 'cancelled';
  cancelled_at?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  role: string;
}

export interface TimeSlot {
  from: number;
  to: number;
}

export interface AvailabilityResponse {
  unavailable: Record<string, { from: number; to: number }[]>;
  workDays: number[];
  workStart: number;
  workEnd: number;
  bufferMinutes: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaymentResponse {
  data: {
    link: string;
  };
}

export interface ApiError extends Error {
  status?: number;
  response?: {
    data?: {
      error?: string;
    };
  };
}

export interface BookingResponse {
  message: string;
  booking: Booking;
  warning?: string;
}

export interface CancelBookingResponse {
  message: string;
  refunded: boolean;
}

interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  performed_by_name: string;
  created_at: string;
}

interface WalletResponse {
  wallet: Wallet;
  transactions: WalletTransaction[];
}

interface PaymentInitiateResponse {
  payment_type?: 'wallet';
  wallet_balance?: number;
  amount?: number;
  data?: {
    link: string;
  };
}

interface SettingsResponse {
  workDays: number[];
  workStart: number;
  workEnd: number;
  bufferMinutes: number;
}

interface WalletUpdateResponse {
  wallet: Wallet;
}

export interface BookingComment {
  id: number;
  booking_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user_name: string;
  user_picture: string;
  user_role: string;
}

export interface GetCommentsResponse {
  comments: BookingComment[];
}

export interface AddCommentResponse {
  message: string;
  comment: BookingComment;
}

export interface UpdateCommentResponse {
  message: string;
  comment: BookingComment;
}

// API Client
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Initialize token from localStorage if it exists
    this.token = localStorage.getItem('auth_token');

    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add token
    this.client.interceptors.request.use((config) => {
      // Always check both memory and localStorage for token
      const currentToken = this.getToken();
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token on auth errors
          this.setToken(null);
          // Redirect to home page if not already there
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }

        // Log the full error for debugging
        console.error('API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.response?.data?.error,
          originalError: error.message
        });

        // Transform error to include more details
        const apiError = new Error(
          error.response?.data?.error || error.message
        ) as ApiError;
        apiError.status = error.response?.status;
        apiError.response = error.response;
        return Promise.reject(apiError);
      }
    );
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

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config);
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
  async createBooking(data: any): Promise<BookingResponse> {
    try {
      const response = await this.post<BookingResponse>('/api/bookings', data);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        const apiError = error as ApiError;
        if (apiError.status === 403 && apiError.response?.data?.error) {
          throw new Error(apiError.response.data.error);
        }
      }
      throw error;
    }
  }

  async getBookings() {
    const response = await this.get<{ data: { bookings: Booking[] } }>('/api/bookings');
    return response.data.data;
  }

  async getAvailability(): Promise<AvailabilityResponse> {
    const response = await this.get<AvailabilityResponse>('/api/bookings/availability');
    return response.data;
  }

  async markBookingAsPaid(bookingId: number) {
    const response = await this.patch(`/api/bookings/${bookingId}/mark-paid`);
    return response.data;
  }

  async cancelBooking(bookingId: number) {
    const response = await this.post<CancelBookingResponse>(`/api/bookings/${bookingId}/cancel`);
    return response.data;
  }

  // Payment Endpoints
  async initiatePayment(data: any) {
    const response = await this.post<PaymentResponse>('/api/payment/flutterwave/initiate', data);
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

  async updateUserRole(userId: number, role: string) {
    const response = await this.patch(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  }

  async getSettings() {
    const response = await this.get<SettingsResponse>('/api/admin/settings');
    return response;
  }

  async updateSettings(data: any) {
    const response = await this.patch('/api/admin/settings', data);
    return response.data;
  }

  async getStats() {
    const response = await this.get('/api/admin/stats');
    return response.data;
  }

  // Wallet endpoints
  async getWallet() {
    const response = await this.get<WalletResponse>('/api/wallet');
    return response.data;
  }

  async debitWallet(amount: number, description: string) {
    const response = await this.post<WalletUpdateResponse>('/api/wallet/debit', { amount, description });
    return response.data;
  }

  // Payment endpoints
  async initiatePaymentWallet(data: {
    amount: number;
    email: string;
    name: string;
    tx_ref: string;
    redirect_url: string;
    use_wallet?: boolean;
  }) {
    const response = await this.post<PaymentInitiateResponse>('/api/payment/flutterwave/initiate', data);
    return response.data;
  }

  async verifyPaymentWallet(data: {
    transaction_id?: string;
    booking_data: any;
    payment_type?: 'wallet' | 'flutterwave';
  }) {
    const response = await this.post('/api/payment/flutterwave/verify', data);
    return response.data;
  }

  async getBookingComments(bookingId: number): Promise<GetCommentsResponse> {
    const response = await this.get<GetCommentsResponse>(`/api/bookings/${bookingId}/comments`);
    return response.data;
  }

  async addBookingComment(bookingId: number, comment: string): Promise<AddCommentResponse> {
    const response = await this.post<AddCommentResponse>(`/api/bookings/${bookingId}/comments`, { comment });
    return response.data;
  }

  async editBookingComment(bookingId: number, commentId: number, comment: string): Promise<UpdateCommentResponse> {
    const response = await this.patch<UpdateCommentResponse>(
      `/api/bookings/${bookingId}/comments/${commentId}`,
      { comment }
    );
    return response.data;
  }
}

export const api = new ApiClient(); 