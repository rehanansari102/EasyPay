'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Bell,
  BellOff,
  CheckCheck,
  ArrowLeftRight,
  ShieldCheck,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────
interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ── Icon per notification type ─────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  const base = 'w-5 h-5';
  if (type.startsWith('TRANSACTION') || type === 'TRANSFER_SENT' || type === 'TRANSFER_RECEIVED' || type === 'TOPUP_SUCCESS') {
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
        <ArrowLeftRight className={cn(base, 'text-indigo-500')} />
      </div>
    );
  }
  if (type.startsWith('SECURITY') || type.startsWith('AUTH') || type === 'PASSWORD_CHANGED' || type === 'LOGIN') {
    return (
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className={cn(base, 'text-amber-500')} />
      </div>
    );
  }
  if (type.startsWith('KYC')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <CheckCheck className={cn(base, 'text-emerald-500')} />
      </div>
    );
  }
  if (type.startsWith('WARN') || type.startsWith('ALERT')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className={cn(base, 'text-red-500')} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
      <Info className={cn(base, 'text-slate-500')} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: NotificationDto[]; total: number }>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(false),
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationsApi.unreadCount,
  });

  const { mutate: markRead, isPending: isMarkingOne } = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: () => toast.error('Failed to mark as read'),
  });

  const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: () => toast.error('Failed to mark all as read'),
  });

  const notifications: NotificationDto[] = data?.data ?? [];
  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? 0} total · {unreadCount} unread
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-60 transition"
          >
            {isMarkingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BellOff className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold">No notifications yet</p>
            <p className="text-muted-foreground text-sm">
              You&apos;ll see transaction alerts, security updates, and account activity here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-4 p-4 transition',
                  !notif.read
                    ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                )}
              >
                <NotifIcon type={notif.type} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn('text-sm', !notif.read ? 'font-semibold' : 'font-medium')}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                  <p className="text-muted-foreground/60 text-[11px] mt-1.5">
                    {format(new Date(notif.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>

                {!notif.read && (
                  <button
                    onClick={() => markRead(notif.id)}
                    disabled={isMarkingOne}
                    title="Mark as read"
                    className="text-muted-foreground hover:text-primary flex-shrink-0 transition disabled:opacity-50 mt-0.5"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
