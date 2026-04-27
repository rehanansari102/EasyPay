'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['', 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];
const TYPE_OPTIONS = ['', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REVERSAL'];

export default function AdminTransactionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'transactions', page, status, type],
    queryFn: () =>
      adminApi.getTransactions({ page, limit: 20, status: status || undefined, type: type || undefined }),
    enabled: user?.role === 'ADMIN',
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => adminApi.reverseTransaction(id),
    onSuccess: () => {
      toast.success('Transaction reversed');
      setConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed'); setConfirmId(null); },
  });

  if (user?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? '—'} total transactions
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t || 'All Types'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">ID</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Sender</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Receiver</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Date</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {tx.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' :
                        tx.type === 'WITHDRAWAL' ? 'bg-amber-500/10 text-amber-500' :
                        tx.type === 'REVERSAL' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-indigo-500/10 text-indigo-400'
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {tx.senderWallet?.user?.email ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {tx.receiverWallet?.user?.email ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-mono">
                      ${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                        tx.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' :
                        tx.status === 'REVERSED' ? 'bg-slate-500/10 text-slate-400' :
                        'bg-amber-500/10 text-amber-500'
                      )}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {tx.status === 'COMPLETED' && tx.type === 'TRANSFER' && (
                        confirmId === tx.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">Confirm?</span>
                            <button
                              onClick={() => reverseMutation.mutate(tx.id)}
                              disabled={reverseMutation.isPending}
                              className="text-xs px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-muted/40 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                            title="Reverse transaction"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} — {data.total} transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
