import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';

interface Transaction {
  id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  performed_by_name: string;
  created_at: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col space-y-1 p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                  </span>
                  <span className={`font-bold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{transaction.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {transaction.performed_by_name}</span>
                  <span>{format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No transactions found
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistory; 