'use client';

import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

export function Header() {
  const { theme, setTheme } = useTheme();

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-border flex items-center justify-end px-6 gap-4">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <a
        href="/dashboard/notifications"
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {countData?.count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {countData.count > 9 ? '9+' : countData.count}
          </span>
        )}
      </a>
    </header>
  );
}
