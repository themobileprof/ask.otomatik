import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarDays, Clock, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BOOKING_DATA_KEY = 'pending_booking_data';

interface TimeSlot {
  from: number;
  to: number;
}

interface AvailabilityData {
  workDays: number[];
  workStart: number;
  workEnd: number;
  bufferMinutes: number;
  unavailable: {
    [date: string]: TimeSlot[];
  };
}

const SubscriptionCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  // Available time slots for paid sessions (hourly slots)
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const data = await api.getAvailability();
      setAvailability(data);
    } catch (error) {
      console.error('Failed to load availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load availability",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDateUnavailable = (date: Date) => {
    if (!availability) return false;
    
    // Check if it's a work day
    const dayOfWeek = date.getDay();
    if (!availability.workDays.includes(dayOfWeek)) return true;

    // Check if there are any slots available
    const dateStr = format(date, 'yyyy-MM-dd');
    const unavailableSlots = availability.unavailable[dateStr] || [];
    const totalHours = availability.workEnd - availability.workStart;
    const totalUnavailableHours = unavailableSlots.reduce((total, slot) => {
      return total + (slot.to - slot.from);
    }, 0);

    // If all hours are booked, the date is unavailable
    return totalUnavailableHours >= totalHours;
  };

  const getAvailableTimeSlots = () => {
    if (!date || !availability) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    const unavailableSlots = availability.unavailable[dateStr] || [];

    return timeSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      const adjustedHour = hour === 12 ? 12 : hour % 12;
      const is24Hour = time.includes('PM') ? adjustedHour + 12 : adjustedHour;

      return !unavailableSlots.some(
        slot => is24Hour >= slot.from && is24Hour < slot.to
      );
    });
  };

  const getAvailableEndTimes = () => {
    if (!selectedTime) return [];
    
    const startIndex = timeSlots.indexOf(selectedTime);
    if (startIndex === -1) return [];
    
    // Return all times after the selected start time that are available
    return timeSlots.slice(startIndex + 1);
  };

  const calculateDuration = () => {
    if (!selectedTime || !selectedEndTime) return '';
    
    const startIndex = timeSlots.indexOf(selectedTime);
    const endIndex = timeSlots.indexOf(selectedEndTime);
    const hours = endIndex - startIndex;
    
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const calculateCost = () => {
    if (!selectedTime || !selectedEndTime) return '';
    
    const startIndex = timeSlots.indexOf(selectedTime);
    const endIndex = timeSlots.indexOf(selectedEndTime);
    const hours = endIndex - startIndex;
    
    return `$${hours * 75}`;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setSelectedEndTime(''); // Reset end time when start time changes
  };

  const handleEndTimeSelect = (endTime: string) => {
    setSelectedEndTime(endTime);
  };

  const handleBookSession = async () => {
    if (!date || !selectedTime || !selectedEndTime || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in and select all required fields",
      });
      return;
    }

    try {
      setIsBooking(true);
      const cost = calculateCost().replace('$', '');
      const bookingData = {
        date: format(date, 'yyyy-MM-dd'),
        time: selectedTime,
        endTime: selectedEndTime,
        type: 'paid',
        email: user.email,
        cost: cost,
      };

      const tx_ref = uuidv4();

      // Store booking data in localStorage
      localStorage.setItem(BOOKING_DATA_KEY, JSON.stringify({
        ...bookingData,
        tx_ref,
      }));

      try {
        const paymentResponse = await api.initiatePayment({
          amount: cost,
          email: user.email,
          name: user.name,
          tx_ref,
          redirect_url: `${window.location.origin}/payment-complete`,
          booking_data: bookingData,
        });

        // Redirect to Flutterwave checkout
        window.location.href = paymentResponse.data.link;
        return;
      } catch (error: any) {
        console.error('Failed to initiate payment:', error);
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: error.response?.data?.error || error.message || "Unable to process payment",
        });
      }
    } catch (error: any) {
      console.error('Booking process failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || error.message || "Unable to process request",
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Professional Consultation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Badge className="bg-blue-500 text-white px-4 py-2 text-sm font-semibold">
            <DollarSign className="w-4 h-4 mr-2" />
            Professional Consultation
          </Badge>
        </div>
        <CardTitle className="text-center text-2xl font-bold text-slate-900">Book Your Session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-slate-700">Flexible duration</span>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-slate-700">$75/hour</span>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className={cn("rounded-md border")}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today || isDateUnavailable(date);
            }}
            modifiers={{
              busy: (date) => isDateUnavailable(date),
            }}
            modifiersStyles={{
              busy: { backgroundColor: "rgb(254 226 226)", color: "rgb(220 38 38)" },
            }}
          />
          
          {date && (
            <div className="space-y-4">
              <h3 className="font-medium">Selected Date: {format(date, 'MMMM d, yyyy')}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Start Time</span>
                  </div>
                  <Select value={selectedTime} onValueChange={handleTimeSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTimeSlots().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTime && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">End Time</span>
                    </div>
                    <Select value={selectedEndTime} onValueChange={handleEndTimeSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableEndTimes().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {selectedTime && selectedEndTime && (
                <div className="flex justify-between items-center text-sm text-slate-700 bg-white p-3 rounded-lg">
                  <span>Duration: {calculateDuration()}</span>
                  <span className="font-semibold">{calculateCost()}</span>
                </div>
              )}

              {availability && (
                <div className="text-sm text-gray-500">
                  <p>Working Hours: {availability.workStart}:00 - {availability.workEnd}:00</p>
                  <p>Buffer between sessions: {availability.bufferMinutes} minutes</p>
                </div>
              )}
              
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleBookSession}
                disabled={!selectedTime || !selectedEndTime || isBooking}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Book Session'
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCalendar; 