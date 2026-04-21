import apiClient from '@/lib/api-client';
import { LoginDto, RegisterDto } from '@finvault/shared';

export const authApi = {
  register: (dto: RegisterDto) =>
    apiClient.post<{ user: any }>('/auth/register', dto).then((r) => r.data),

  login: (dto: LoginDto) =>
    apiClient.post<{ user: any }>('/auth/login', dto).then((r) => r.data),

  logout: () => apiClient.delete('/auth/logout'),

  refresh: () =>
    apiClient.post<{ user: any }>('/auth/refresh').then((r) => r.data),

  getMe: () => apiClient.get('/auth/me').then((r) => r.data),
};

export const walletApi = {
  getWallet: () => apiClient.get('/wallet').then((r) => r.data),
  getCards: () => apiClient.get('/wallet/cards').then((r) => r.data),
  createCard: (data: { nameOnCard: string; spendingLimit?: number }) =>
    apiClient.post('/wallet/cards', data).then((r) => r.data),
  toggleFreezeCard: (cardId: string) =>
    apiClient.patch(`/wallet/cards/${cardId}/toggle-freeze`).then((r) => r.data),
};

export const transactionsApi = {
  getHistory: (params?: Record<string, any>) =>
    apiClient.get('/transactions', { params }).then((r) => r.data),
  getById: (id: string) => apiClient.get(`/transactions/${id}`).then((r) => r.data),
  transfer: (data: { toAccountNumber: string; amount: number; description?: string }) =>
    apiClient.post('/transactions/transfer', data).then((r) => r.data),
};

export const paymentsApi = {
  createTopup: (amount: number) =>
    apiClient.post('/payments/topup', { amount }).then((r) => r.data),
};

export const notificationsApi = {
  list: (onlyUnread?: boolean) =>
    apiClient.get('/notifications', { params: { onlyUnread } }).then((r) => r.data),
  unreadCount: () => apiClient.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
};
