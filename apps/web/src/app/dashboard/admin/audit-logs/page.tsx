'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, userId],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 25, userId: userId || undefined }),
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserId(userIdInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? '—'} log entries
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder="Filter by user ID…"
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
            Filter
          </button>
          {userId && (
            <button
              type="button"
              onClick={() => { setUserId(''); setUserIdInput(''); setPage(1); }}
              className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">IP Address</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded w-28" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.length === 0
              ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              )
              : data?.data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-sm">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{log.userId?.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {log.action}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} — {data.total} entries
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
