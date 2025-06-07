import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token
        const token = api.getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await api.checkSession();
        if (response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Clear invalid token
        api.setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (credential: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.googleSignIn(credential);
      
      if (response.data.token && response.data.user) {
        api.setToken(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error('No token or user data received');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('Failed to sign in with Google');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await api.signOut();
      api.setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      setError('Failed to sign out');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 