'use client';

import { useQuery } from '@tanstack/react-query';
import { walletApi, transactionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@easypay/shared';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { StatCard } from '@/components/dashboard/stat-card';
import { TransactionDto } from '@easypay/shared';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.getWallet,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: 50 }],
    queryFn: () => transactionsApi.getHistory({ limit: 50, page: 1 }),
  });

  // Compute 30-day stats
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const txList: TransactionDto[] = transactions?.data ?? [];
  const sent30d = txList
    .filter((t) => new Date(t.createdAt) > cutoff && t.type !== 'DEPOSIT' && t.receiverWalletId !== wallet?.id)
    .reduce((s, t) => s + Number(t.amount), 0);
  const received30d = txList
    .filter((t) => new Date(t.createdAt) > cutoff && (t.type === 'DEPOSIT' || t.receiverWalletId === wallet?.id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const currency = wallet?.currency ?? 'USD';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Here&apos;s what&apos;s happening with your finances today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Balance"
          value={wallet ? formatCurrency(wallet.balance, currency) : '—'}
          icon={Wallet}
          color="indigo"
          isLoading={walletLoading}
        />
        <StatCard
          label="Sent (30d)"
          value={formatCurrency(sent30d, currency)}
          icon={ArrowUpRight}
          color="rose"
          isLoading={txLoading}
        />
        <StatCard
          label="Received (30d)"
          value={formatCurrency(received30d, currency)}
          icon={ArrowDownLeft}
          color="emerald"
          isLoading={txLoading}
        />
        <StatCard
          label="Transactions"
          value={String(txList.length)}
          icon={CreditCard}
          color="violet"
          isLoading={txLoading}
        />
      </div>

      {/* Balance + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BalanceCard wallet={wallet} isLoading={walletLoading} />
        </div>
        <QuickActions />
      </div>

      {/* Transactions + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions
          transactions={txList.slice(0, 5)}
          walletId={wallet?.id}
          isLoading={txLoading}
        />
        <SpendingChart transactions={txList} />
      </div>
    </div>
  );
}
