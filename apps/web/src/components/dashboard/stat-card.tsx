'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorMap = {
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    icon: 'text-indigo-500',
    badge: 'text-indigo-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    icon: 'text-emerald-500',
    badge: 'text-emerald-400',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    icon: 'text-rose-500',
    badge: 'text-rose-400',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    icon: 'text-violet-500',
    badge: 'text-violet-400',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: 'text-amber-500',
    badge: 'text-amber-400',
  },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: keyof typeof colorMap;
  trend?: { value: string; positive: boolean };
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'indigo',
  trend,
  isLoading,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-lift animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', c.bg)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.positive
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-500',
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        {isLoading ? (
          <div className="h-7 w-28 skeleton rounded-lg" />
        ) : (
          <p className="text-2xl font-bold tracking-tight stat-value">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}
