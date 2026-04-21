export const APP_NAME = 'FinVault';
export const APP_VERSION = '1.0.0';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export const TRANSACTION_FEE_PERCENT = 0.5; // 0.5% platform fee on transfers

export const MIN_TRANSFER_AMOUNT = 1;      // $1
export const MAX_TRANSFER_AMOUNT = 10000;  // $10,000 per transaction
export const DAILY_TRANSFER_LIMIT = 50000; // $50,000/day

export const MIN_TOPUP_AMOUNT = 10;    // $10
export const MAX_TOPUP_AMOUNT = 50000; // $50,000

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const REDIS_KEYS = {
  REFRESH_TOKEN: (userId: string) => `refresh_token:${userId}`,
  RATE_LIMIT: (ip: string) => `rate_limit:${ip}`,
  EMAIL_VERIFY: (token: string) => `email_verify:${token}`,
  PASSWORD_RESET: (token: string) => `pwd_reset:${token}`,
  NOTIFICATION_CHANNEL: (userId: string) => `notifications:${userId}`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes
  LONG: 3600,        // 1 hour
  REFRESH_TOKEN: 60 * 60 * 24 * 7, // 7 days
} as const;
