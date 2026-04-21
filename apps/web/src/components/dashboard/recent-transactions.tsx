'use client';

import { TransactionDto } from '@finvault/shared';
import { formatCurrency } from '@finvault/shared';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  transactions: TransactionDto[];
  walletId: string | undefined;
  isLoading: boolean;
}

function TransactionIcon({ type }: { type: string }) {
  if (type === 'DEPOSIT')
    return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
  if (type === 'WITHDRAWAL')
    return <ArrowUpRight className="w-4 h-4 text-red-600" />;
  return <RefreshCw className="w-4 h-4 text-blue-600" />;
}

export function RecentTransactions({ transactions, walletId, isLoading }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Transactions</h3>
        <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const isIncoming =
              tx.type === 'DEPOSIT' || (tx.type === 'TRANSFER' && tx.receiverWalletId === walletId);
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <TransactionIcon type={tx.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
                <p className={cn('text-sm font-semibold', isIncoming ? 'text-green-600' : 'text-red-500')}>
                  {isIncoming ? '+' : '-'}
                  {formatCurrency(tx.amount, tx.currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
