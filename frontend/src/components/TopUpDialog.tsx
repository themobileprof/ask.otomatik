import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), {
      message: 'Amount must be a number',
    })
    .refine(val => Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
});

interface TopUpDialogProps {
  children: React.ReactNode;
}

const TopUpDialog: React.FC<TopUpDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { fetchWallet } = useWallet();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
    },
  });

  // Handle Flutterwave redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const tx_id = params.get('transaction_id');
    const tx_ref = params.get('tx_ref');

    if (status && tx_ref?.startsWith('wallet_topup_') && tx_id) {
      handlePaymentVerification(tx_id);
      // Clean up URL
      navigate('/dashboard', { replace: true });
    }
  }, [location]);

  const handlePaymentVerification = async (transactionId: string) => {
    try {
      await api.post('/api/payment/flutterwave/verify', { 
        transaction_id: transactionId,
        payment_type: 'wallet'
      });
      await fetchWallet();
      toast({
        title: 'Success',
        description: 'Wallet topped up successfully',
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify payment",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to top up your wallet",
      });
      return;
    }

    setIsLoading(true);
    try {
      const tx_ref = `wallet_topup_${uuidv4()}`;
      const response = await api.initiatePaymentWallet({
        amount: Number(values.amount),
        email: user.email,
        name: user.name,
        tx_ref,
        redirect_url: `${window.location.origin}/dashboard?wallet=true`,
        use_wallet: false
      });

      // Redirect to Flutterwave payment page
      if (response.data?.link) {
        window.location.href = response.data.link;
      } else {
        throw new Error('No payment link received');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initiate payment",
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            Add funds to your wallet using Flutterwave
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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Top Up'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog; 