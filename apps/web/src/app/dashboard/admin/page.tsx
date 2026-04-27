'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { adminApi } from '@/lib/api';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, ArrowLeftRight, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@easypay/shared';

export default function AdminOverviewPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Platform-wide statistics and management.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats ? String(stats.totalUsers) : '—'}
          icon={Users}
          color="indigo"
          isLoading={isLoading}
        />
        <StatCard
          label="Active Users"
          value={stats ? String(stats.activeUsers) : '—'}
          icon={Users}
          color="emerald"
          isLoading={isLoading}
        />
        <StatCard
          label="Total Volume"
          value={stats ? formatCurrency(stats.totalVolume, 'USD') : '—'}
          icon={DollarSign}
          color="violet"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending KYC"
          value={stats ? String(stats.pendingKyc) : '—'}
          icon={AlertCircle}
          color="amber"
          isLoading={isLoading}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Manage Users', desc: 'View, suspend, approve KYC', href: '/dashboard/admin/users', color: 'from-indigo-500 to-violet-600' },
          { label: 'Transactions', desc: 'Review and reverse transfers', href: '/dashboard/admin/transactions', color: 'from-rose-500 to-orange-500' },
          { label: 'Audit Logs', desc: 'Full platform activity trail', href: '/dashboard/admin/audit-logs', color: 'from-emerald-500 to-teal-600' },
        ].map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="bg-card border border-border rounded-2xl p-5 text-left card-lift hover:border-indigo-500/30 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} mb-3 flex items-center justify-center`}>
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
