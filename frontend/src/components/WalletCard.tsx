import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
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
import { Loader2 } from 'lucide-react';

const WalletCard: React.FC = () => {
  const { wallet, transactions, isLoading } = useWallet();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Wallet not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <CardDescription>Your wallet balance and recent transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="text-2xl font-bold">
            ${wallet.balance.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            Current Balance
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.performed_by_name}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No transactions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletCard; 