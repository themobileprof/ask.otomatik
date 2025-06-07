import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const BOOKING_DATA_KEY = 'pending_booking_data';

const PaymentComplete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const transactionId = searchParams.get('transaction_id');
        const txRef = searchParams.get('tx_ref');
        const status = searchParams.get('status');

        if (!transactionId) {
          throw new Error('No transaction ID found');
        }

        // Get booking data from localStorage
        const storedBookingData = localStorage.getItem(BOOKING_DATA_KEY);
        const bookingData = storedBookingData ? JSON.parse(storedBookingData) : null;

        if (!bookingData) {
          throw new Error('No booking data found');
        }

        // Verify that the tx_ref matches
        if (txRef && txRef !== bookingData.tx_ref) {
          throw new Error('Transaction reference mismatch');
        }

        const response = await api.verifyPayment(transactionId, bookingData);

        if (response.status === 'success') {
          setStatus('success');
          toast({
            title: 'Payment Successful',
            description: 'Your booking has been confirmed.',
          });
          // Clear the stored booking data
          localStorage.removeItem(BOOKING_DATA_KEY);
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error) {
        setStatus('error');
        toast({
          title: 'Payment Failed',
          description: error instanceof Error ? error.message : 'Failed to verify payment',
          variant: 'destructive',
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, toast]);

  const handleReturn = () => {
    navigate('/#booking');
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {isVerifying ? (
              <div className="py-8">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
                <h2 className="text-xl font-semibold mt-4">Verifying Payment...</h2>
                <p className="text-slate-600 mt-2">Please wait while we confirm your payment</p>
              </div>
            ) : status === 'success' ? (
              <div className="py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                <p className="text-slate-600 mt-2 mb-6">Your booking has been confirmed</p>
                <Button onClick={handleReturn} className="w-full">
                  Return to Booking
                </Button>
              </div>
            ) : (
              <div className="py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Failed</h2>
                <p className="text-slate-600 mt-2 mb-6">There was an error processing your payment</p>
                <Button onClick={handleReturn} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentComplete; 