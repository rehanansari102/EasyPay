'use client';

import { TransactionDto } from '@easypay/shared';
import { formatCurrency } from '@easypay/shared';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  transactions: TransactionDto[];
  walletId: string | undefined;
  isLoading: boolean;
}

type TxMeta = {
  label: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  amountColor: string;
  prefix: string;
};

function getTxMeta(tx: TransactionDto, walletId: string | undefined): TxMeta {
  const isIncoming =
    tx.type === 'DEPOSIT' || (tx.type === 'TRANSFER' && tx.receiverWalletId === walletId);

  if (tx.type === 'DEPOSIT') {
    return {
      label: 'Deposit',
      Icon: ArrowDownLeft,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      amountColor: 'text-emerald-500',
      prefix: '+',
    };
  }
  if (tx.type === 'WITHDRAWAL') {
    return {
      label: 'Withdrawal',
      Icon: ArrowUpRight,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
      amountColor: 'text-rose-500',
      prefix: '-',
    };
  }
  if (tx.type === 'FEE') {
    return {
      label: 'Fee',
      Icon: Zap,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      amountColor: 'text-amber-500',
      prefix: '-',
    };
  }
  // TRANSFER
  if (isIncoming) {
    return {
      label: 'Transfer In',
      Icon: ArrowDownLeft,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      amountColor: 'text-emerald-500',
      prefix: '+',
    };
  }
  return {
    label: 'Transfer Out',
    Icon: RefreshCw,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-400',
    amountColor: 'text-rose-500',
    prefix: '-',
  };
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-500',
  PENDING: 'bg-amber-500/10 text-amber-500',
  FAILED: 'bg-rose-500/10 text-rose-500',
};

export function RecentTransactions({ transactions, walletId, isLoading }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Recent Transactions</h3>
        <Link
          href="/dashboard/transactions"
          className="text-xs text-primary/70 hover:text-primary font-medium transition-colors"
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => {
            const meta = getTxMeta(tx, walletId);
            const statusClass = statusColors[tx.status] ?? 'bg-muted text-muted-foreground';
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', meta.iconBg)}>
                  <meta.Icon className={cn('w-4.5 h-4.5', meta.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {tx.description ?? meta.label}
                    </p>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0', statusClass)}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(tx.createdAt), 'MMM d · h:mm a')}
                  </p>
                </div>
                <p className={cn('text-sm font-bold flex-shrink-0', meta.amountColor)}>
                  {meta.prefix}{formatCurrency(tx.amount, tx.currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

