import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Calendar as CalendarIcon, Gift, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const BOOKING_DATA_KEY = 'pending_booking_data';

const Booking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('free');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'free' | 'paid'>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    unavailable: Record<string, { from: number; to: number }[]>;
    workDays: number[];
    workStart: number;
    workEnd: number;
    bufferMinutes: number;
  }>();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const data = await api.getAvailability();
      setAvailability(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load availability. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Available time slots for free sessions (30-minute slots)
  const freeTimeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
  ];

  // Available time slots for paid sessions (hourly slots)
  const paidTimeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  const handleBookingClick = (type: 'free' | 'paid') => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to book a session.',
        variant: 'destructive',
      });
      return;
    }
    setBookingType(type);
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedEndTime('');
    setIsDialogOpen(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (bookingType === 'paid') {
      setSelectedEndTime(''); // Reset end time when start time changes
    }
  };

  const handleEndTimeSelect = (endTime: string) => {
    setSelectedEndTime(endTime);
  };

  const getAvailableEndTimes = () => {
    if (!selectedTime || bookingType === 'free' || !selectedDate) return [];
    
    const startIndex = paidTimeSlots.indexOf(selectedTime);
    if (startIndex === -1) return [];
    
    // Return all times after the selected start time that are available
    return paidTimeSlots.slice(startIndex + 1).filter(time => 
      isTimeSlotAvailable(selectedDate, time)
    );
  };

  const calculateDuration = () => {
    if (bookingType === 'free') return '30 minutes';
    if (!selectedTime || !selectedEndTime) return '';
    
    const startIndex = paidTimeSlots.indexOf(selectedTime);
    const endIndex = paidTimeSlots.indexOf(selectedEndTime);
    const hours = endIndex - startIndex;
    
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const calculateCost = () => {
    if (bookingType === 'free') return 'Free';
    if (!selectedTime || !selectedEndTime) return '';
    
    const startIndex = paidTimeSlots.indexOf(selectedTime);
    const endIndex = paidTimeSlots.indexOf(selectedEndTime);
    const hours = endIndex - startIndex;
    
    return `$${hours * 75}`;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    // Add duration (in minutes)
    const totalMinutes = hour24 * 60 + minutes + duration;
    const newHour = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    // Convert back to 12-hour format
    let newHour12 = newHour;
    let newPeriod = 'AM';
    if (newHour >= 12) {
      newPeriod = 'PM';
      if (newHour > 12) newHour12 = newHour - 12;
    }
    if (newHour12 === 0) newHour12 = 12;

    return `${newHour12}:${newMinutes.toString().padStart(2, '0')} ${newPeriod}`;
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime || !user) return;

    try {
      setIsLoading(true);
      const bookingData = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        endTime: bookingType === 'paid' 
          ? selectedEndTime 
          : calculateEndTime(selectedTime, 30), // 30 minutes for free consultation
        type: bookingType,
        email: user.email,
      };

      if (bookingType === 'free') {
        await api.createBooking(bookingData);
        toast({
          title: 'Success',
          description: 'Your free consultation has been booked!',
        });
      } else {
        const cost = calculateCost().replace('$', '');
        const tx_ref = uuidv4();

        // Store booking data in localStorage
        localStorage.setItem(BOOKING_DATA_KEY, JSON.stringify({
          ...bookingData,
          tx_ref,
        }));

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
      }

      setIsDialogOpen(false);
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedEndTime('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to book session',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isBookingValid = () => {
    if (!user) return false;
    if (bookingType === 'free') {
      return selectedDate && selectedTime;
    }
    return selectedDate && selectedTime && selectedEndTime;
  };

  const isTimeSlotAvailable = (date: Date, time: string) => {
    if (!availability || !selectedDate) return true;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const unavailableSlots = availability.unavailable[dateStr] || [];
    
    // Convert time string to hour number (24-hour format)
    const [timeStr, period] = time.split(' ');
    const [hours, minutes] = timeStr.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    // For paid bookings, check if any hour in the range is unavailable
    if (bookingType === 'paid' && selectedEndTime) {
      const [endTimeStr, endPeriod] = selectedEndTime.split(' ');
      const [endHours] = endTimeStr.split(':').map(Number);
      let endHour24 = endHours;
      if (endPeriod === 'PM' && endHours !== 12) endHour24 += 12;
      if (endPeriod === 'AM' && endHours === 12) endHour24 = 0;

      // Check if any hour in the range is unavailable
      for (let h = hour24; h <= endHour24; h++) {
        if (unavailableSlots.some(slot => h >= slot.from && h < slot.to)) {
          return false;
        }
      }
      return true;
    }

    // For free bookings (30-minute slots)
    const slotEnd = minutes === 30 ? hour24 + 1 : hour24 + 0.5;
    return !unavailableSlots.some(slot => {
      // Check if either the start or end of the 30-minute slot overlaps with an unavailable slot
      const slotStart = hour24;
      return (slotStart >= slot.from && slotStart < slot.to) || 
             (slotEnd > slot.from && slotEnd <= slot.to);
    });
  };

  return (
    <section id="booking" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Book Your Session
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose between a free 30-minute consultation or schedule paid expert sessions
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-2 bg-slate-100 rounded-2xl">
              <TabsTrigger value="free" className="text-lg font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                Free Consultation
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-lg text-blue-600 font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                Expert Sessions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="free" className="space-y-6">
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm font-semibold">
                      <Gift className="w-4 h-4 mr-2" />
                      First-Time Only
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-bold text-slate-900">Free 30-Minute Consultation</CardTitle>
                  <CardDescription className="text-lg text-slate-600 mt-4">
                    Perfect for understanding your needs and exploring how we can help
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-emerald-600" />
                      <span className="text-slate-700">30 minutes duration</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-slate-700">Monday - Friday</span>
                    </div>
                  </div>
                  <div className="text-center pt-6">
                    <Dialog open={isDialogOpen && bookingType === 'free'} onOpenChange={(open) => {
                      if (bookingType === 'free') setIsDialogOpen(open);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-12 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                          onClick={() => handleBookingClick('free')}
                        >
                          Book Free Session
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-bold">
                            Schedule Your Free Consultation
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Select Date</h3>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => {
                                const day = date.getDay();
                                return day === 0 || day === 6 || date < new Date();
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Select Time (30 min slots)</h3>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                              {freeTimeSlots.map((time) => (
                                <Button
                                  key={time}
                                  variant={selectedTime === time ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleTimeSelect(time)}
                                  disabled={selectedDate && !isTimeSlotAvailable(selectedDate, time)}
                                >
                                  {time}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={handleConfirmBooking}
                            disabled={!isBookingValid() || isLoading}
                            className="w-full md:w-auto"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Booking...
                              </>
                            ) : (
                              'Confirm Booking'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="paid" className="space-y-6">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Badge className="bg-blue-500 text-white px-4 py-2 text-sm font-semibold">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Professional Consultation
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-bold text-slate-900">Paid Consultation</CardTitle>
                  <CardDescription className="text-lg text-slate-600 mt-4">
                    In-depth consultation tailored to your specific needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-slate-700">Flexible duration</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-slate-700">$75/hour</span>
                    </div>
                  </div>
                  <div className="text-center pt-6">
                    <Dialog open={isDialogOpen && bookingType === 'paid'} onOpenChange={(open) => {
                      if (bookingType === 'paid') setIsDialogOpen(open);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-12 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                          onClick={() => handleBookingClick('paid')}
                        >
                          Book Paid Session
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-bold">
                            Schedule Your Paid Consultation
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Select Date</h3>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => {
                                const day = date.getDay();
                                return day === 0 || day === 6 || date < new Date();
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </div>
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Select Start Time</h3>
                              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                {paidTimeSlots.map((time) => (
                                  <Button
                                    key={time}
                                    variant={selectedTime === time ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleTimeSelect(time)}
                                    disabled={selectedDate && !isTimeSlotAvailable(selectedDate, time)}
                                  >
                                    {time}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            {selectedTime && (
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Select End Time</h3>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                  {getAvailableEndTimes().map((time) => (
                                    <Button
                                      key={time}
                                      variant={selectedEndTime === time ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleEndTimeSelect(time)}
                                      disabled={selectedDate && !isTimeSlotAvailable(selectedDate, time)}
                                    >
                                      {time}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedTime && selectedEndTime && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Duration: {calculateDuration()}</span>
                              <span className="text-slate-900 font-semibold">Cost: {calculateCost()}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={handleConfirmBooking}
                            disabled={!isBookingValid() || isLoading}
                            className="w-full md:w-auto"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Proceed to Payment'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default Booking;
