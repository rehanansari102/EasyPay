'use client';

import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'Your financial summary' },
  '/dashboard/wallet': { title: 'Wallet', subtitle: 'Balance & account details' },
  '/dashboard/transactions': { title: 'Transactions', subtitle: 'Your payment history' },
  '/dashboard/cards': { title: 'Virtual Cards', subtitle: 'Manage your cards' },
  '/dashboard/notifications': { title: 'Notifications', subtitle: 'All activity updates' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Account preferences' },
};

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const { title, subtitle } = PAGE_META[pathname] ?? { title: 'EasyPay', subtitle: '' };

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: (query) => query.state.error ? false : 30_000, // stop polling if server is down
  });

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0f0f1a]/90 backdrop-blur-md border-b border-border/50 flex items-center px-6 gap-4 sticky top-0 z-10 animate-slide-down">
      {/* Left: dynamic page title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold leading-none">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {countData?.count > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-scale-in" />
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>
      </div>
    </header>
  );
}

