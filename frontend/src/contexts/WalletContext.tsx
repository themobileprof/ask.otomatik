import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface WalletTransaction {
  id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  performed_by_name: string;
  created_at: string;
}

interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface WalletResponse {
  wallet: Wallet;
  transactions: WalletTransaction[];
}

interface WalletUpdateResponse {
  message: string;
  wallet: Wallet;
}

interface WalletContextType {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  isLoading: boolean;
  fetchWallet: () => Promise<void>;
  debitWallet: (amount: number, description: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchWallet = async () => {
    if (!isAuthenticated) {
      setWallet(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get<WalletResponse>('/api/wallet');
      setWallet(response.data.wallet);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch wallet information",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const debitWallet = async (amount: number, description: string): Promise<boolean> => {
    try {
      const response = await api.post<WalletUpdateResponse>('/api/wallet/debit', { amount, description });
      setWallet(response.data.wallet);
      await fetchWallet(); // Refresh transactions
      toast({
        title: "Success",
        description: "Payment processed successfully",
      });
      return true;
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payment",
      });
      return false;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    }
  }, [isAuthenticated]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        isLoading,
        fetchWallet,
        debitWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 