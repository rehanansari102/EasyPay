'use client';

import { useState } from 'react';
import { formatCurrency } from '@easypay/shared';
import { WalletDto } from '@easypay/shared';
import { TrendingUp, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  wallet: WalletDto | undefined;
  isLoading: boolean;
}

export function BalanceCard({ wallet, isLoading }: Props) {
  const [hideBalance, setHideBalance] = useState(false);

  const copyAccountNumber = () => {
    if (wallet?.accountNumber) {
      navigator.clipboard.writeText(wallet.accountNumber);
      toast.success('Account number copied!');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-7 text-white bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-xl shadow-indigo-500/20 animate-fade-in card-shine"
    >      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-4 w-56 h-56 bg-indigo-400/20 rounded-full blur-3xl" />
        {/* Subtle mesh grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mesh" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mesh)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          {/* Balance section */}
          <div>
            <p className="text-indigo-200/70 text-xs font-semibold uppercase tracking-widest">
              Total Balance
            </p>
            <div className="flex items-center gap-3 mt-2.5">
              {isLoading ? (
                <div className="h-10 w-44 bg-white/20 rounded-xl animate-pulse" />
              ) : hideBalance ? (
                <p className="text-4xl font-bold tracking-tight">••••••</p>
              ) : (
                <p className="text-4xl font-bold tracking-tight">
                  {wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
                </p>
              )}
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 flex-shrink-0"
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? (
                  <Eye className="w-4 h-4 text-indigo-200" />
                ) : (
                  <EyeOff className="w-4 h-4 text-indigo-200" />
                )}
              </button>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-indigo-200/70 text-xs">
                  {wallet?.currency ?? 'USD'} Account
                </span>
              </div>
              <span className="text-indigo-300/30 text-xs">•</span>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* Account number pill */}
          <button
            onClick={copyAccountNumber}
            className="flex-shrink-0 bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-200 rounded-2xl px-4 py-3 text-left group"
          >
            <p className="text-indigo-200/60 text-[10px] uppercase tracking-wider font-medium">
              Account No.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-sm font-semibold tracking-wide">
                {wallet?.accountNumber ?? '—————————'}
              </p>
              <Copy className="w-3 h-3 text-indigo-200/60 group-hover:text-white transition-colors" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

