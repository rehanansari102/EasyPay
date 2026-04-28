'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Search, ChevronLeft, ChevronRight, Eye, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined }),
    enabled: user?.role === 'ADMIN',
  });

  const suspendMutation = useMutation({
    mutationFn: adminApi.suspendUser,
    onSuccess: () => {
      toast.success('User suspended');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed'),
  });

  const activateMutation = useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => {
      toast.success('User activated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed'),
  });

  if (user?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? '—'} registered users
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">KYC</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Balance</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-5 py-3.5 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-400'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        u.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                        u.kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' :
                        u.kycStatus === 'SUBMITTED' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-500/10 text-slate-400'
                      )}>
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm">
                      ${Number(u.wallet?.balance ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      )}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/admin/users/${u.id}`)}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {u.isActive ? (
                          <button
                            onClick={() => suspendMutation.mutate(u.id)}
                            disabled={suspendMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                            title="Suspend user"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => activateMutation.mutate(u.id)}
                            disabled={activateMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                            title="Activate user"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} — {data.total} users
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
