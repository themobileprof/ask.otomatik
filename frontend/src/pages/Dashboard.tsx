import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from '@/components/Layout';

interface Booking {
  id: string;
  date: string;
  time: string;
  endTime: string;
  type: 'free' | 'paid';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.getBookings();
        // Ensure we're setting an array, default to empty array if data is undefined
        setBookings(response?.data?.bookings || []);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setError('Failed to load bookings. Please try again later.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
      setError('Please sign in to view your bookings.');
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12">
        <div className="container mx-auto px-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <h2 className="text-2xl font-bold mb-8">My Bookings</h2>
        
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-slate-600">
                You haven't made any bookings yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-semibold">
                    {booking.type === 'free' ? 'Free Consultation' : 'Paid Session'}
                  </CardTitle>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Date</p>
                      <p className="font-medium">{format(new Date(booking.date), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Time</p>
                      <p className="font-medium">
                        {booking.time} - {booking.endTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard; 