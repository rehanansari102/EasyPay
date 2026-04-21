import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: jest.Mocked<PrismaService>;
  let walletService: jest.Mocked<WalletService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockSenderWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: { toString: () => '500' } as any,
    status: 'ACTIVE',
    currency: 'USD',
    accountNumber: '1111111111',
  };

  const mockReceiverWallet = {
    id: 'wallet-2',
    userId: 'user-2',
    balance: { toString: () => '100' } as any,
    status: 'ACTIVE',
    currency: 'USD',
    accountNumber: '2222222222',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: {
            wallet: { findUnique: jest.fn() },
            transaction: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: { getWalletByAccountNumber: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    prisma = module.get(PrismaService) as any;
    walletService = module.get(WalletService) as any;
    notificationsService = module.get(NotificationsService) as any;
  });

  describe('transfer', () => {
    it('should throw BadRequestException for amount below minimum', async () => {
      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 0.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for amount above maximum', async () => {
      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if sender wallet not found', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-transfer', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockSenderWallet);

      await expect(
        service.transfer('user-1', { toAccountNumber: '1111111111', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const lowBalanceWallet = { ...mockSenderWallet, balance: 0.5 };
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(lowBalanceWallet);
      (walletService.getWalletByAccountNumber as jest.Mock).mockResolvedValue(mockReceiverWallet);

      await expect(
        service.transfer('user-1', { toAccountNumber: '2222222222', amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete a successful transfer', async () => {
      const mockTx = {
        id: 'tx-1',
        reference: 'ref-1',
        type: 'TRANSFER',
        status: 'COMPLETED',
        amount: { toString: () => '100' },
        fee: { toString: () => '0.5' },
        currency: 'USD',
        description: null,
        senderWalletId: 'wallet-1',
        receiverWalletId: 'wallet-2',
        createdAt: new Date(),
      };

      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockSenderWallet);
      (walletService.getWalletByAccountNumber as jest.Mock).mockResolvedValue(mockReceiverWallet);
      (prisma.$transaction as jest.Mock).mockResolvedValue(mockTx);
      (notificationsService.send as jest.Mock).mockResolvedValue(undefined);

      const result = await service.transfer('user-1', {
        toAccountNumber: '2222222222',
        amount: 100,
        description: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('TRANSFER');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(notificationsService.send).toHaveBeenCalledTimes(2);
    });
  });
});
