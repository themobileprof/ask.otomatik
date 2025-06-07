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
import { Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsData = await api.getStats();
      setStats(statsData);
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

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              Latest consultation bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
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
                        <span>{booking.userName || booking.email}</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>
              Next scheduled consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.upcomingBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
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
                        <span>{booking.userName || booking.email}</span>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard; 