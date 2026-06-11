import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';

const mockSenderWallet = {
  id: 'wallet-1',
  userId: 'user-1',
  balance: 500,
  status: 'ACTIVE',
  currency: 'USD',
  accountNumber: '1111111111',
};

const mockReceiverWallet = {
  id: 'wallet-2',
  userId: 'user-2',
  balance: 100,
  status: 'ACTIVE',
  currency: 'USD',
  accountNumber: '2222222222',
};

const mockTx = {
  id: 'tx-1',
  reference: 'ref-1',
  type: 'TRANSFER',
  status: 'COMPLETED',
  amount: 100,
  fee: 1,
  currency: 'USD',
  description: null,
  senderWalletId: 'wallet-1',
  receiverWalletId: 'wallet-2',
  createdAt: new Date(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let walletService: any;
  let notificationsService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: {
            wallet: { findUnique: jest.fn() },
            user: { findMany: jest.fn().mockResolvedValue([]) },
            transaction: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              aggregate: jest.fn(),
            },
            virtualCard: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: { getWalletByAccountNumber: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MailerService,
          useValue: { sendTransactionReceipt: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    prisma = module.get(PrismaService);
    walletService = module.get(WalletService);
    notificationsService = module.get(NotificationsService);

    // Default: no prior transfers today
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
  });

  // ── transfer ──────────────────────────────────────────────────
  describe('transfer', () => {
    it('throws BadRequestException for amount below minimum', async () => {
      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 0.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for amount above maximum', async () => {
      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if sender wallet not found', async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if sender wallet is suspended', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ ...mockSenderWallet, status: 'SUSPENDED' });

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for self-transfer', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);

      await expect(
        service.transfer('user-1', { toAccountNumber: '1111111111', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when daily limit is exceeded', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 999999 } });

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for insufficient balance', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ ...mockSenderWallet, balance: 5 });
      walletService.getWalletByAccountNumber.mockResolvedValue(mockReceiverWallet);

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when receiver wallet is not ACTIVE', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      walletService.getWalletByAccountNumber.mockResolvedValue({ ...mockReceiverWallet, status: 'SUSPENDED' });

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('completes a successful transfer and sends notifications to both parties', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      walletService.getWalletByAccountNumber.mockResolvedValue(mockReceiverWallet);
      prisma.$transaction.mockResolvedValue(mockTx);

      const result = await service.transfer('user-1', {
        toAccountNumber: '2222222222',
        amount: 100,
        description: 'Test',
      });

      expect(result).toHaveProperty('type', 'TRANSFER');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(notificationsService.send).toHaveBeenCalledTimes(2);
    });

    it('uses a single atomic DB transaction for balance updates', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      walletService.getWalletByAccountNumber.mockResolvedValue(mockReceiverWallet);
      prisma.$transaction.mockResolvedValue(mockTx);

      await service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── getHistory ────────────────────────────────────────────────
  describe('getHistory', () => {
    it('returns paginated transaction list', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      prisma.transaction.findMany.mockResolvedValue([mockTx]);
      prisma.transaction.count.mockResolvedValue(1);

      const result = await service.getHistory('user-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('throws NotFoundException if wallet not found', async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getHistory('user-1', { page: 1, limit: 20 })).rejects.toThrow(NotFoundException);
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe('getById', () => {
    it('returns the transaction when found', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      prisma.transaction.findFirst.mockResolvedValue(mockTx);

      const result = await service.getById('user-1', 'tx-1');

      expect(result).toHaveProperty('id', 'tx-1');
    });

    it('throws NotFoundException when transaction does not exist', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.getById('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
