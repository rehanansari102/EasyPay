'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, LockKeyhole, Unlock } from 'lucide-react';
import { formatCurrency } from '@easypay/shared';
import { cn } from '@/lib/utils';

type WalletEntry = {
  id: string;
  accountNumber: string;
  balance: string | number;
  currency: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
};

export default function AdminWalletsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'wallets', page],
    queryFn: () => adminApi.getWallets({ page, limit: 20 }),
    enabled: user?.role === 'ADMIN',
  });

  const suspendMutation = useMutation({
    mutationFn: adminApi.suspendWallet,
    onSuccess: () => {
      toast.success('Wallet suspended');
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const activateMutation = useMutation({
    mutationFn: adminApi.activateWallet,
    onSuccess: () => {
      toast.success('Wallet activated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  if (user?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  const wallets: WalletEntry[] = data?.data ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {data?.total ?? '—'} total wallets
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Owner</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Account No.</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Balance</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Created</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : wallets.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No wallets found
                    </td>
                  </tr>
                )
              : wallets.map((wallet) => {
                  const isSuspended = wallet.status === 'SUSPENDED';
                  const isActing =
                    (suspendMutation.isPending && suspendMutation.variables === wallet.id) ||
                    (activateMutation.isPending && activateMutation.variables === wallet.id);

                  return (
                    <tr key={wallet.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {wallet.user.firstName} {wallet.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{wallet.user.email}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {wallet.accountNumber}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(wallet.balance), wallet.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          isSuspended
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-emerald-500/10 text-emerald-600',
                        )}>
                          {wallet.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(wallet.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isSuspended ? (
                          <button
                            disabled={isActing}
                            onClick={() => activateMutation.mutate(wallet.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                          >
                            <Unlock className="w-3 h-3" />
                            Activate
                          </button>
                        ) : (
                          <button
                            disabled={isActing}
                            onClick={() => {
                              if (window.confirm('Suspend this wallet? The user will not be able to transact.')) {
                                suspendMutation.mutate(wallet.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50 transition"
                          >
                            <LockKeyhole className="w-3 h-3" />
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
