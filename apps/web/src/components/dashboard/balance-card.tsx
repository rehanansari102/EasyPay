'use client';

import { formatCurrency } from '@finvault/shared';
import { WalletDto } from '@finvault/shared';
import { TrendingUp, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  wallet: WalletDto | undefined;
  isLoading: boolean;
}

export function BalanceCard({ wallet, isLoading }: Props) {
  const copyAccountNumber = () => {
    if (wallet?.accountNumber) {
      navigator.clipboard.writeText(wallet.accountNumber);
      toast.success('Account number copied!');
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-blue-200 text-sm font-medium">Total Balance</p>
          {isLoading ? (
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-4xl font-bold mt-1">
              {wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 text-blue-200 text-sm">
            <TrendingUp className="w-3 h-3" />
            <span>Account active</span>
          </div>
        </div>

        <div
          className="bg-white/10 rounded-xl px-4 py-2 cursor-pointer hover:bg-white/20 transition"
          onClick={copyAccountNumber}
        >
          <p className="text-xs text-blue-200">Account No.</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-mono text-sm font-semibold">{wallet?.accountNumber ?? '—'}</p>
            <Copy className="w-3 h-3 text-blue-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
