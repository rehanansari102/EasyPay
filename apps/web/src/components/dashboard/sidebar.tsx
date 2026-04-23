'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Bell,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/cards', label: 'Virtual Cards', icon: CreditCard },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    } finally {
      logout();
      toast.success('Signed out successfully');
      router.push('/auth/login');
    }
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <aside className="w-64 bg-[#0b0b16] flex flex-col border-r border-white/[0.04] flex-shrink-0">
      {/* Logo */}
      <div className="px-5 pt-7 pb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-none tracking-tight">EasyPay</p>
          <p className="text-slate-500 text-[10px] mt-0.5 tracking-wide">Digital Banking</p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pb-2">
        <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest">Menu</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-indigo-500/10 text-white border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0',
                  isActive
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-violet-500/30'
                    : 'bg-white/[0.04] group-hover:bg-white/[0.08]',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200',
                  )}
                />
              </div>
              <span className="flex-1">{label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 space-y-0.5 border-t border-white/[0.04]">
        <Link
          href="/dashboard/settings"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center flex-shrink-0 transition-all duration-200">
            <Settings className="w-4 h-4" />
          </div>
          Settings
        </Link>

        {/* User card */}
        <div className="mt-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-500 text-xs truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-red-400 flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
