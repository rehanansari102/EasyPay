import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function showNotificationToast(notification: { title: string; message: string; type: string }) {
  const opts = { description: notification.message, duration: 5000 };

  switch (notification.type) {
    case 'TRANSACTION':
      toast.success(notification.title, opts);
      break;
    case 'SECURITY':
      toast.warning(notification.title, opts);
      break;
    default:
      toast.info(notification.title, opts);
  }
}

export function useNotificationStream() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const url = `${API_BASE_URL}/api/v1/notifications/stream`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (event) => {
      // Show toast — parsed separately so query refetches always run
      try {
        const notification = JSON.parse(event.data);
        if (notification?.title) {
          showNotificationToast(notification);
        }
      } catch {
        toast.info('New notification');
      }

      // Refresh notification badge/list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

      // Force-refetch wallet + transactions so balance updates immediately
      queryClient.refetchQueries({ queryKey: ['wallet'] });
      queryClient.refetchQueries({ queryKey: ['transactions'] });
    };

    es.onerror = () => {
      // Browser will auto-reconnect; nothing to do here.
    };

    return () => {
      es.close();
    };
  }, [user, queryClient]);
}

