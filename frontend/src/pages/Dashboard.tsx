import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { WalletProvider } from '@/contexts/WalletContext';
import WalletCard from '@/components/WalletCard';
import BookingsList from '@/components/BookingsList';
import SubscriptionCalendar from '@/components/SubscriptionCalendar';
import TopUpDialog from '@/components/TopUpDialog';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <WalletProvider>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
          <TopUpDialog>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Top Up Wallet
            </Button>
          </TopUpDialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <WalletCard />
            <BookingsList />
                    </div>
                    <div>
            <SubscriptionCalendar />
          </div>
        </div>
      </div>
    </WalletProvider>
  );
};

export default UserDashboard; 