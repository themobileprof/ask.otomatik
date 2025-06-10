import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
}

interface AuthResponse {
  token: string;
  user: User;
}

interface SessionResponse {
  user: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (googleCredential: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const signIn = async (googleCredential: string) => {
    try {
      const response = await api.post<AuthResponse>('/auth/google', { credential: googleCredential });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      api.setToken(token);
      setUser(user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    api.setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      api.get<SessionResponse>('/auth/session')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          api.setToken(null);
        });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 