import apiClient from '@/lib/api-client';
import { LoginDto, RegisterDto } from '@easypay/shared';

export const authApi = {
  register: (dto: RegisterDto) =>
    apiClient.post<{ user: any }>('/auth/register', dto).then((r) => r.data),

  login: (dto: LoginDto) =>
    apiClient
      .post<{ user: any } | { requires2fa: true; tempSessionId: string }>('/auth/login', dto)
      .then((r) => r.data),

  logout: () => apiClient.delete('/auth/logout'),

  refresh: () =>
    apiClient.post<{ user: any }>('/auth/refresh').then((r) => r.data),

  getMe: () => apiClient.get('/auth/me').then((r) => r.data),

  // ── Email Verification ──────────────────────────────────────────
  verifyEmail: (token: string) =>
    apiClient.post<{ message: string }>('/auth/email/verify', { token }).then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient.post<{ message: string }>('/auth/email/resend', { email }).then((r) => r.data),

  // ── Password Reset ──────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient
      .post<{ message: string }>('/auth/reset-password', { token, newPassword })
      .then((r) => r.data),

  // ── Two-Factor Authentication ───────────────────────────────────
  generate2fa: () =>
    apiClient
      .post<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>('/auth/2fa/generate')
      .then((r) => r.data),

  enable2fa: (code: string) =>
    apiClient.post<{ message: string }>('/auth/2fa/enable', { code }).then((r) => r.data),

  disable2fa: (code: string) =>
    apiClient.post<{ message: string }>('/auth/2fa/disable', { code }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<{ message: string }>('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),

  verifyTwoFactor: (tempSessionId: string, code: string) =>
    apiClient
      .post<{ user: any }>('/auth/2fa/verify', { tempSessionId, code })
      .then((r) => r.data),
};

export const walletApi = {
  getWallet: () => apiClient.get('/wallet').then((r) => r.data),
  getCards: () => apiClient.get('/wallet/cards').then((r) => r.data),
  createCard: (data: { nameOnCard: string; spendingLimit?: number }) =>
    apiClient.post('/wallet/cards', data).then((r) => r.data),
  toggleFreezeCard: (cardId: string) =>
    apiClient.patch(`/wallet/cards/${cardId}/toggle-freeze`).then((r) => r.data),
  deleteCard: (cardId: string) =>
    apiClient.delete(`/wallet/cards/${cardId}`).then((r) => r.data),
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
  requestWithdrawal: (data: {
    amount: number;
    bankAccountNumber: string;
    bankRoutingNumber: string;
    accountHolderName: string;
  }) => apiClient.post('/payments/withdraw', data).then((r) => r.data),
};

export const notificationsApi = {
  list: (onlyUnread?: boolean) =>
    apiClient.get('/notifications', { params: { onlyUnread } }).then((r) => r.data),
  unreadCount: () => apiClient.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
};

export const kycApi = {
  getStatus: () => apiClient.get('/kyc/status').then((r) => r.data),
  submit: (data: { docType: string; docNumber: string; frontImageUrl: string; backImageUrl?: string; selfieUrl?: string }) =>
    apiClient.post('/kyc/submit', data).then((r) => r.data),
};

export const usersApi = {
  getProfile: () => apiClient.get('/users/me').then((r) => r.data),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    apiClient.patch('/users/me', data).then((r) => r.data),
  uploadAvatar: (file: File) => {
    console.log('Uploading avatar file:', file);
    const form = new FormData();
    form.append('avatar', file);
    return apiClient.post('/users/me/avatar', form).then((r) => r.data);
  },
};

export const adminApi = {
  getStats: () => apiClient.get('/admin/stats').then((r) => r.data),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/admin/users', { params }).then((r) => r.data),
  getUserById: (id: string) => apiClient.get(`/admin/users/${id}`).then((r) => r.data),
  suspendUser: (id: string) => apiClient.patch(`/admin/users/${id}/suspend`).then((r) => r.data),
  activateUser: (id: string) => apiClient.patch(`/admin/users/${id}/activate`).then((r) => r.data),
  updateKyc: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
    apiClient.patch(`/admin/users/${id}/kyc`, { status, notes }).then((r) => r.data),

  // KYC submissions
  getKycSubmissions: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/admin/kyc', { params }).then((r) => r.data),
  getKycDocument: (userId: string) =>
    apiClient.get(`/admin/kyc/${userId}`).then((r) => r.data),

  // Wallets
  getWallets: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/wallets', { params }).then((r) => r.data),
  suspendWallet: (id: string) => apiClient.patch(`/admin/wallets/${id}/suspend`).then((r) => r.data),
  activateWallet: (id: string) => apiClient.patch(`/admin/wallets/${id}/activate`).then((r) => r.data),

  // Transactions
  getTransactions: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    apiClient.get('/admin/transactions', { params }).then((r) => r.data),
  reverseTransaction: (id: string) =>
    apiClient.post(`/admin/transactions/${id}/reverse`).then((r) => r.data),

  // Audit logs
  getAuditLogs: (params?: { page?: number; limit?: number; userId?: string }) =>
    apiClient.get('/admin/audit-logs', { params }).then((r) => r.data),
};
