import { useEffect, useState } from 'react';
import { api, Booking as APIBooking, BookingComment } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Clock, Calendar, Link as LinkIcon, X, AlertTriangle, History, MessageCircle } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';

const BookingsList = () => {
  const [bookings, setBookings] = useState<APIBooking[]>([]);
  const [activeBookings, setActiveBookings] = useState<APIBooking[]>([]);
  const [expiredBookings, setExpiredBookings] = useState<APIBooking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<APIBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<APIBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const { toast } = useToast();
  const { fetchWallet } = useWallet();
  const [loadingTimeoutId, setLoadingTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Add a small delay before loading to avoid rapid successive calls
    const timeoutId = setTimeout(() => {
      loadBookings();
    }, 500);
    
    setLoadingTimeoutId(timeoutId);

    return () => {
      if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
      }
    };
  }, []);

  const loadBookings = async () => {
    try {
      setError(null);
      const response = await api.getBookings();
      setBookings(response.bookings);
      
      // Filter bookings into active, expired, and cancelled
      const now = new Date();
      const active: APIBooking[] = [];
      const expired: APIBooking[] = [];
      const cancelled: APIBooking[] = [];

      response.bookings.forEach(booking => {
        if (booking.status === 'cancelled') {
          cancelled.push(booking);
          return;
        }

        const endTimeStr = booking.endTime || booking.time; // fallback to start time if no end time
        const [endTime, endPeriod] = endTimeStr.split(' ');
        const [endHours, endMinutes] = endTime.split(':');
        let endHour = parseInt(endHours);
        
        // Convert to 24-hour format
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;
        
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(endHour, parseInt(endMinutes), 0);

        if (bookingDate < now) {
          expired.push(booking);
        } else {
          active.push(booking);
        }
      });

      // Sort cancelled bookings by date (newest first)
      cancelled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sort expired bookings by date (newest first)
      expired.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sort active bookings by date (earliest first)
      active.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setCancelledBookings(cancelled);
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
    
    // Parse the booking time properly
    const [time, period] = booking.time.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    // Convert to 24-hour format
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    // Create booking date with proper time
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(hour, parseInt(minutes), 0, 0);
    
    // Get current date with time set to midnight
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const daysUntilBooking = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilBooking > 7;
  };

  interface BookingCardProps {
    booking: APIBooking;
    isPast?: boolean;
  }

  const BookingCard = ({ booking, isPast }: BookingCardProps) => {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<BookingComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editedComment, setEditedComment] = useState('');
    const [isEditingComment, setIsEditingComment] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const userComment = user ? comments.find(comment => comment.user_id === user.id) : null;

    const loadComments = async () => {
      try {
        setIsLoadingComments(true);
        const response = await api.getBookingComments(booking.id);
        setComments(response.comments);
      } catch (error: any) {
        console.error('Failed to load comments:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.response?.data?.error || error.message || "Failed to load comments",
        });
      } finally {
        setIsLoadingComments(false);
      }
    };

    const handleAddComment = async () => {
      if (!newComment.trim()) return;

      try {
        setIsAddingComment(true);
        const response = await api.addBookingComment(booking.id, newComment.trim());
        setComments(prev => [response.comment, ...prev]);
        setNewComment('');
        toast({
          title: "Success",
          description: "Comment added successfully",
        });
      } catch (error: any) {
        console.error('Failed to add comment:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.response?.data?.error || error.message || "Failed to add comment",
        });
      } finally {
        setIsAddingComment(false);
      }
    };

    const handleEditComment = async (commentId: number) => {
      if (!editedComment.trim()) return;

      try {
        setIsEditingComment(true);
        const response = await api.editBookingComment(booking.id, commentId, editedComment.trim());
        setComments(prev => prev.map(c => c.id === commentId ? response.comment : c));
        setEditingCommentId(null);
        setEditedComment('');
        toast({
          title: "Success",
          description: "Comment updated successfully",
        });
      } catch (error: any) {
        console.error('Failed to update comment:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.response?.data?.error || error.message || "Failed to update comment",
        });
      } finally {
        setIsEditingComment(false);
      }
    };

    const startEditing = (comment: BookingComment) => {
      setEditingCommentId(comment.id);
      setEditedComment(comment.comment);
    };

    const cancelEditing = () => {
      setEditingCommentId(null);
      setEditedComment('');
    };

    useEffect(() => {
      if (showComments) {
        loadComments();
      }
    }, [showComments, booking.id]);

    return (
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
            {!isPast && canCancel(booking) && (
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
          {!isPast && booking.meet_link && booking.status !== 'cancelled' && (
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
          {!isPast && !canCancel(booking) && booking.status !== 'cancelled' && (
            <div className="flex items-center text-amber-600 text-sm mt-2">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Cannot cancel within 7 days of session
            </div>
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              {showComments ? 'Hide Comments' : 'Show Comments'}
            </Button>

            {showComments && (
              <div className="mt-4 space-y-4">
                {!userComment && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add your comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                      className="w-full"
                    >
                      {isAddingComment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Adding...
                        </>
                      ) : (
                        'Add Comment'
                      )}
                    </Button>
                  </div>
                )}

                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No comments yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                        {comment.user_picture && (
                          <img
                            src={comment.user_picture}
                            alt={comment.user_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comment.user_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.user_role}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={editedComment}
                                onChange={(e) => setEditedComment(e.target.value)}
                                className="min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={!editedComment.trim() || isEditingComment}
                                >
                                  {isEditingComment ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  disabled={isEditingComment}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-gray-700">{comment.comment}</p>
                              {user && (comment.user_id === user.id || user.role === 'admin') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-8 text-gray-500 hover:text-gray-700"
                                  onClick={() => startEditing(comment)}
                                >
                                  Edit
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <CardTitle>Your Bookings</CardTitle>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <X className="h-4 w-4" />
                Cancelled Bookings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px]">
              <DialogHeader>
                <DialogTitle>Cancelled Bookings</DialogTitle>
                <DialogDescription>
                  History of all cancelled consultations
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : cancelledBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No cancelled bookings found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cancelledBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} isPast={true} />
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
                      <BookingCard key={booking.id} booking={booking} isPast={true} />
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} isPast={false} />
          ))}
          {activeBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No upcoming bookings
            </div>
          )}
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
            <div className="space-y-4">
              <AlertDialogDescription>
                {selectedBooking?.type === 'paid' 
                  ? 'Are you sure you want to cancel this session? The cost will be refunded to your wallet.'
                  : 'Are you sure you want to cancel this session?'
                }
              </AlertDialogDescription>
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Type "cancel session" to confirm cancellation
                </div>
                <Input
                  value={cancelConfirmText}
                  onChange={(e) => setCancelConfirmText(e.target.value)}
                  placeholder="Type 'cancel session'"
                  className="w-full"
                />
              </div>
            </div>
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