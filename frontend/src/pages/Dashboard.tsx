import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { WalletProvider } from '@/contexts/WalletContext';
import WalletCard from '@/components/WalletCard';
import BookingsList from '@/components/BookingsList';
import SubscriptionCalendar from '@/components/SubscriptionCalendar';
import TopUpDialog from '@/components/TopUpDialog';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Handle any state updates from redirects
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('payment_status')) {
      // Clear the URL parameters without triggering a full page reload
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  return (
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
  );
};

const UserDashboard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <WalletProvider>
      <DashboardContent />
    </WalletProvider>
  );
};

export default UserDashboard; 