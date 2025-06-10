import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { MoreHorizontal, Shield, User, Wallet } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface UserData {
  id: number;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
  totalBookings: number;
  lastBooking?: string;
  wallet?: {
    balance: number;
  };
}

interface WalletData {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  data: UserData[];
}

interface WalletsResponse {
  data: WalletData[];
}

const topUpFormSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), {
      message: 'Amount must be a number',
    })
    .refine(val => Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  description: z.string().min(1, 'Description is required'),
});

interface TopUpDialogProps {
  userId: number;
  onTopUp: () => void;
}

const TopUpDialog: React.FC<TopUpDialogProps> = ({ userId, onTopUp }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof topUpFormSchema>>({
    resolver: zodResolver(topUpFormSchema),
    defaultValues: {
      amount: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof topUpFormSchema>) => {
    setIsLoading(true);
    try {
      await api.post('/api/wallet/admin/topup', {
        userId,
        amount: Number(values.amount),
        description: values.description,
      });
      toast({
        title: 'Success',
        description: 'Wallet topped up successfully',
      });
      setOpen(false);
      form.reset();
      onTopUp();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to top up wallet",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Wallet className="w-4 h-4 mr-2" />
          Top Up Wallet
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up User Wallet</DialogTitle>
          <DialogDescription>
            Add funds to the user's wallet for external payments
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter amount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter reason for top-up"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Top Up
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const [usersResponse, walletsResponse] = await Promise.all([
        api.get<UsersResponse>('/api/admin/users'),
        api.get<WalletsResponse>('/api/admin/wallets'),
      ]);

      const wallets = walletsResponse.data.data.reduce((acc: Record<number, WalletData>, wallet) => {
        acc[wallet.user_id] = wallet;
        return acc;
      }, {});

      const usersWithWallets = usersResponse.data.data.map((user: UserData) => ({
        ...user,
        wallet: wallets[user.id],
      }));

      setUsers(usersWithWallets);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: 'user' | 'admin') => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users Management</CardTitle>
          <CardDescription>
            Manage user roles, wallets, and view booking history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Total Bookings</TableHead>
                <TableHead>Last Booking</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.picture} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100'
                      }
                    >
                      <div className="flex items-center gap-1">
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {user.role}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${user.wallet?.balance?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>{user.totalBookings}</TableCell>
                  <TableCell>
                    {user.lastBooking
                      ? new Date(user.lastBooking).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              user.id,
                              user.role === 'admin' ? 'user' : 'admin'
                            )
                          }
                        >
                          {user.role === 'admin' ? (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Make Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <TopUpDialog userId={user.id} onTopUp={loadUsers} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users; 