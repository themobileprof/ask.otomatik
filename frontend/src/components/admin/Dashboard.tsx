import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Users, Clock, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Booking {
  id: number;
  date: string;
  time: string;
  endTime: string;
  type: 'free' | 'paid';
  email: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  cost: string;
  createdAt: string;
  userName?: string;
  userPicture?: string;
}

interface Stats {
  totalBookings: number;
  totalPaidBookings: number;
  totalFreeBookings: number;
  totalRevenue: number;
  totalUsers: number;
  bookingsByType: Array<{ type: string; count: number }>;
  recentBookings: Booking[];
  upcomingBookings: Booking[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalPaidBookings: 0,
    totalFreeBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    bookingsByType: [],
    recentBookings: [],
    upcomingBookings: []
  });
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [expiredBookings, setExpiredBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.getStats() as Stats;
      
      const now = new Date();
      const expired: Booking[] = [];
      const active: Booking[] = [];

      const parseBookingDateTime = (booking: Booking) => {
        const timeStr = booking.time;
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        
        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        const date = new Date(booking.date);
        date.setHours(hour, parseInt(minutes), 0);
        return date;
      };

      // Combine all bookings and sort them
      const allBookings = [...response.recentBookings, ...response.upcomingBookings];
      allBookings.forEach(booking => {
        const bookingDate = parseBookingDateTime(booking);
        if (bookingDate < now) {
          expired.push(booking);
        } else {
          active.push(booking);
        }
      });

      // Sort expired bookings by date (newest first)
      expired.sort((a, b) => {
        const dateA = parseBookingDateTime(a);
        const dateB = parseBookingDateTime(b);
        return dateB.getTime() - dateA.getTime();
      });

      // Sort active bookings by date (earliest first)
      active.sort((a, b) => {
        const dateA = parseBookingDateTime(a);
        const dateB = parseBookingDateTime(b);
        return dateA.getTime() - dateB.getTime();
      });

      setExpiredBookings(expired);
      setActiveBookings(active);
      setStats(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const BookingsTable = ({ bookings }: { bookings: Booking[] }) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead className="w-[100px]">Time</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="text-right w-[100px]">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">
                {format(new Date(booking.date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>{booking.time}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {booking.userPicture && (
                    <img
                      src={booking.userPicture}
                      alt={booking.userName || booking.email}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="truncate max-w-[200px]" title={booking.userName || booking.email}>
                    {booking.userName || booking.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={booking.type === 'paid' ? 'bg-blue-100' : 'bg-green-100'}
                >
                  {booking.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{booking.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" />
              View Past Bookings
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
                <div className="max-h-[60vh] overflow-y-auto">
                  <BookingsTable bookings={expiredBookings} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-slate-500">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Bookings</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPaidBookings}</div>
            <p className="text-xs text-slate-500">Total paid sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-slate-500">Registered clients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>
            Scheduled future consultations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingsTable bookings={activeBookings} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 