export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'REVERSAL' | 'FEE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface TransactionDto {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  fee: string;
  currency: string;
  description: string | null;
  senderWalletId: string | null;
  receiverWalletId: string | null;
  createdAt: string;
}

export interface TransferDto {
  toAccountNumber: string;
  amount: number;
  description?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  data: TransactionDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
