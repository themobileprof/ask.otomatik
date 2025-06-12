import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

const WalletCard = () => {
  const { wallet, transactions, isLoading } = useWallet();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  if (!wallet) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Wallet not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-50 border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Wallet className="h-5 w-5 text-gray-600" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="text-3xl font-bold text-gray-800">${wallet.balance.toFixed(2)}</div>
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="bg-white hover:bg-gray-100">
              View Transaction History
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              View all your wallet transactions
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="capitalize">{transaction.type}</TableCell>
                    <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletCard; 