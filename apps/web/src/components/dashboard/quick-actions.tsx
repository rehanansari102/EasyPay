'use client';

import Link from 'next/link';
import { Send, Download, CreditCard, Plus } from 'lucide-react';

const actions = [
  { href: '/dashboard/transactions?action=send', label: 'Send', icon: Send, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
  { href: '/dashboard/wallet?action=topup', label: 'Top Up', icon: Download, color: 'text-green-600 bg-green-50 dark:bg-green-950' },
  { href: '/dashboard/cards', label: 'Cards', icon: CreditCard, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
];

export function QuickActions() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-border">
      <h3 className="font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
