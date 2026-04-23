'use client';

import Link from 'next/link';
import { Send, Plus, CreditCard, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    href: '/dashboard/transactions?action=send',
    label: 'Send',
    icon: Send,
    gradient: 'from-blue-500 to-indigo-500',
    glow: 'hover:shadow-blue-500/30',
  },
  {
    href: '/dashboard/wallet?action=topup',
    label: 'Top Up',
    icon: Plus,
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'hover:shadow-emerald-500/30',
  },
  {
    href: '/dashboard/cards',
    label: 'Cards',
    icon: CreditCard,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'hover:shadow-violet-500/30',
  },
  {
    href: '/dashboard/transactions',
    label: 'History',
    icon: Clock,
    gradient: 'from-amber-400 to-orange-500',
    glow: 'hover:shadow-amber-500/30',
  },
];

export function QuickActions() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-slide-up delay-100">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
        Quick Actions
      </h3>
      <div className="flex items-center justify-between gap-2">
        {actions.map(({ href, label, icon: Icon, gradient, glow }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-3 flex-1"
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center',
                'shadow-lg hover:shadow-xl active:scale-90 transition-all duration-200 hover:-translate-y-1',
                gradient,
                glow,
              )}
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

