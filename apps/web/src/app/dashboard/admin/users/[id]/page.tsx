'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, UserCheck, UserX, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUserDetailPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: u, isLoading } = useQuery({
    queryKey: ['admin', 'user', params.id],
    queryFn: () => adminApi.getUserById(params.id),
    enabled: currentUser?.role === 'ADMIN',
  });

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendUser(params.id),
    onSuccess: () => { toast.success('User suspended'); queryClient.invalidateQueries({ queryKey: ['admin', 'user', params.id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed'),
  });

  const activateMutation = useMutation({
    mutationFn: () => adminApi.activateUser(params.id),
    onSuccess: () => { toast.success('User activated'); queryClient.invalidateQueries({ queryKey: ['admin', 'user', params.id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed'),
  });

  const kycMutation = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => adminApi.updateKyc(params.id, status),
    onSuccess: (_, status) => { toast.success(`KYC ${status}`); queryClient.invalidateQueries({ queryKey: ['admin', 'user', params.id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed'),
  });

  if (currentUser?.role !== 'ADMIN') { router.push('/dashboard'); return null; }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!u) return <p className="text-muted-foreground">User not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted/40 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{u.firstName} {u.lastName}</h1>
          <p className="text-muted-foreground text-sm">{u.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {u.isActive ? (
            <button
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-sm font-medium rounded-xl transition-colors border border-rose-500/20"
            >
              <UserX className="w-4 h-4" /> Suspend
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-medium rounded-xl transition-colors border border-emerald-500/20"
            >
              <UserCheck className="w-4 h-4" /> Activate
            </button>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Profile</h2>
          {[
            ['Role', u.role],
            ['Status', u.isActive ? 'Active' : 'Suspended'],
            ['Email Verified', u.emailVerified ? 'Yes' : 'No'],
            ['2FA', u.twoFaEnabled ? 'Enabled' : 'Disabled'],
            ['Joined', new Date(u.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Wallet */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Wallet</h2>
          {u.wallet ? (
            <>
              {[
                ['Account #', u.wallet.accountNumber],
                ['Balance', `$${Number(u.wallet.balance).toFixed(2)}`],
                ['Currency', u.wallet.currency],
                ['Status', u.wallet.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium font-mono">{value}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet found.</p>
          )}
        </div>

        {/* KYC */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">KYC Status</h2>
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              u.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
              u.kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' :
              u.kycStatus === 'SUBMITTED' ? 'bg-amber-500/10 text-amber-500' :
              'bg-slate-500/10 text-slate-400'
            )}>
              {u.kycStatus}
            </span>
          </div>
          {u.kycStatus === 'SUBMITTED' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => kycMutation.mutate('APPROVED')}
                disabled={kycMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-medium rounded-xl border border-emerald-500/20 transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => kycMutation.mutate('REJECTED')}
                disabled={kycMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-sm font-medium rounded-xl border border-rose-500/20 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
          {u.kycDocument && (
            <div className="pt-1 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doc Type</span>
                <span className="font-medium">{u.kycDocument.docType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doc Number</span>
                <span className="font-mono">{u.kycDocument.docNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {u.auditLogs?.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
            {u.auditLogs?.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{log.action}</span>
                <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
