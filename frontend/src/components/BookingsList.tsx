import { useEffect, useState } from 'react';
import { api, Booking as APIBooking } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Clock, Calendar, Link as LinkIcon, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const BookingsList = () => {
  const [bookings, setBookings] = useState<APIBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<APIBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setError(null);
      const response = await api.getBookings();
      setBookings(response.bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setError('Failed to load bookings');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setIsCancelling(true);
      const response = await api.cancelBooking(selectedBooking.id);
      toast({
        title: "Success",
        description: response.message,
      });
      if (response.refunded) {
        toast({
          title: "Refund Processed",
          description: "The session cost has been added to your wallet.",
        });
      }
      loadBookings(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to cancel booking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to cancel booking",
      });
    } finally {
      setIsCancelling(false);
      setSelectedBooking(null);
    }
  };

  const canCancel = (booking: APIBooking) => {
    if (booking.status === 'cancelled') return false;
    const bookingDate = new Date(`${booking.date}T${booking.time.replace(/\s*([AP]M)/, '')}:00`);
    const daysUntilBooking = differenceInDays(bookingDate, new Date());
    return daysUntilBooking > 7;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 p-4">
            No bookings found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className={cn(
                "p-4 rounded-lg border",
                booking.status === 'cancelled' ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'
              )}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={booking.type === 'free' ? 'secondary' : 'default'}>
                      {booking.type === 'free' ? 'Free Session' : 'Paid Session'}
                    </Badge>
                    {booking.status === 'cancelled' && (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
                  </div>
                  <span className="text-lg font-semibold">
                    {booking.type === 'paid' ? `$${booking.cost}` : 'Free'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(booking.date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {booking.time} - {booking.endTime}
                  </div>
                </div>
                {booking.meet_link && booking.status !== 'cancelled' && (
                  <a
                    href={booking.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    Join Meeting
                  </a>
                )}
                {canCancel(booking) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel Session
                  </Button>
                )}
                {!canCancel(booking) && booking.status !== 'cancelled' && (
                  <div className="flex items-center text-amber-600 text-sm mt-2">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Cannot cancel within 7 days of session
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? {selectedBooking?.type === 'paid' && 'The cost will be refunded to your wallet.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Cancelling...
                </>
              ) : (
                'Yes, cancel it'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BookingsList; 