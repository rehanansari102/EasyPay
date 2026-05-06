'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useNotificationStream } from '@/hooks/use-notification-stream';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  // Open SSE stream while dashboard is mounted
  useNotificationStream();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Wait for localStorage to rehydrate before making auth decisions
  if (!_hasHydrated) return null;

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-[#f0f2f8] dark:bg-[#08080f]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
