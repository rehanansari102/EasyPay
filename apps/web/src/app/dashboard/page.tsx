'use client';

import { useQuery } from '@tanstack/react-query';
import { walletApi, transactionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@finvault/shared';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.getWallet,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => transactionsApi.getHistory({ limit: 5, page: 1 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good morning, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground">Here&apos;s your financial overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <BalanceCard wallet={wallet} isLoading={walletLoading} />
        </div>
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions
          transactions={transactions?.data ?? []}
          walletId={wallet?.id}
          isLoading={txLoading}
        />
        <SpendingChart transactions={transactions?.data ?? []} />
      </div>
    </div>
  );
}
