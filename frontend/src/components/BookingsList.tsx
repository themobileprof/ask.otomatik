import { useEffect, useState } from 'react';
import { api, Booking as APIBooking } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Clock, Calendar, Link as LinkIcon, X, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const BookingsList = () => {
  const [bookings, setBookings] = useState<APIBooking[]>([]);
  const [activeBookings, setActiveBookings] = useState<APIBooking[]>([]);
  const [expiredBookings, setExpiredBookings] = useState<APIBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<APIBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const { toast } = useToast();
  const { fetchWallet } = useWallet();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setError(null);
      const response = await api.getBookings();
      setBookings(response.bookings);
      
      // Filter bookings into active and expired
      const now = new Date();
      const active: APIBooking[] = [];
      const expired: APIBooking[] = [];

      response.bookings.forEach(booking => {
        const timeStr = booking.time;
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        
        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(hour, parseInt(minutes), 0);

        if (bookingDate < now) {
          expired.push(booking);
        } else {
          active.push(booking);
        }
      });

      // Sort expired bookings by date (newest first)
      expired.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sort active bookings by date (earliest first)
      active.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setExpiredBookings(expired);
      setActiveBookings(active);
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
    if (!selectedBooking || cancelConfirmText !== 'cancel session') return;

    try {
      setIsCancelling(true);
      const response = await api.cancelBooking(selectedBooking.id);
      
      // First refresh the wallet to show updated balance
      if (response.refunded) {
        await fetchWallet();
        toast({
          title: "Refund Processed",
          description: "The session cost has been added to your wallet.",
        });
      }

      // Then refresh the bookings list
      await loadBookings();
      
      toast({
        title: "Success",
        description: response.message,
      });
      
      setCancelConfirmText(''); // Reset the confirmation text
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

  const BookingCard = ({ booking }: { booking: APIBooking }) => (
    <div
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
          {canCancel(booking) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <X className="h-4 w-4 text-red-500 hover:text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel session</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
        {!canCancel(booking) && booking.status !== 'cancelled' && (
          <div className="flex items-center text-amber-600 text-sm mt-2">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Cannot cancel within 7 days of session
          </div>
        )}
      </div>
    </div>
  );

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Bookings</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Past Bookings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Past Bookings</DialogTitle>
              <DialogDescription>
                History of all completed consultations
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              ) : expiredBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No past bookings found
                </div>
              ) : (
                <div className="space-y-4">
                  {expiredBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      </CardContent>

      <AlertDialog open={!!selectedBooking} onOpenChange={(open) => {
        if (!open) {
          setSelectedBooking(null);
          setCancelConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Are you sure you want to cancel this session? {selectedBooking?.type === 'paid' && 'The cost will be refunded to your wallet.'}</p>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Type "cancel session" to confirm cancellation
                </p>
                <Input
                  value={cancelConfirmText}
                  onChange={(e) => setCancelConfirmText(e.target.value)}
                  placeholder="Type 'cancel session'"
                  className="w-full"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCancelling || cancelConfirmText !== 'cancel session'}
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