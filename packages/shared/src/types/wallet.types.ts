export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface WalletDto {
  id: string;
  userId: string;
  balance: string; // serialised Decimal as string
  currency: string;
  status: WalletStatus;
  accountNumber: string;
  createdAt: string;
}

export interface VirtualCardDto {
  id: string;
  walletId: string;
  cardNumberMasked: string; // last 4 digits only
  expiryMonth: number;
  expiryYear: number;
  nameOnCard: string;
  status: 'ACTIVE' | 'FROZEN' | 'CANCELLED';
}

export interface CreateVirtualCardDto {
  nameOnCard: string;
  spendingLimit?: number;
}
