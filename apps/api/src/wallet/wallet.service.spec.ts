import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../common/crypto.service';

const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
  },
  virtualCard: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockCrypto = {
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
};

const wallet = {
  id: 'wallet-id',
  userId: 'user-id',
  accountNumber: 'ACC123',
  balance: 500,
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCrypto },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  // ── getWallet ─────────────────────────────────────────────────
  describe('getWallet', () => {
    it('returns wallet DTO when found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      const result = await service.getWallet('user-id');
      expect(result).toHaveProperty('accountNumber', 'ACC123');
    });

    it('throws NotFoundException when wallet is absent', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.getWallet('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── createVirtualCard ─────────────────────────────────────────
  describe('createVirtualCard', () => {
    const dto = { nameOnCard: 'Test User', spendingLimit: 1000 };

    it('encrypts card number and CVV before persisting', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.create.mockImplementation(async ({ data }) => ({
        id: 'card-id',
        walletId: data.walletId,
        cardNumber: data.cardNumber,
        cvv: data.cvv,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        nameOnCard: data.nameOnCard,
        status: 'ACTIVE',
        spendingLimit: data.spendingLimit,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.createVirtualCard('user-id', dto);

      // encrypt should have been called for cardNumber and cvv
      expect(mockCrypto.encrypt).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('last4');
    });

    it('throws ForbiddenException if wallet is not ACTIVE', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ...wallet, status: 'FROZEN' });
      await expect(service.createVirtualCard('user-id', dto)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.virtualCard.create).not.toHaveBeenCalled();
    });
  });

  // ── freezeCard ────────────────────────────────────────────────
  describe('freezeCard', () => {
    it('toggles card status from ACTIVE to FROZEN', async () => {
      const card = { id: 'card-id', walletId: wallet.id, cardNumber: 'enc:123', cvv: 'enc:456', status: 'ACTIVE', expiryMonth: 1, expiryYear: 2026, nameOnCard: 'Test', spendingLimit: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue(card);
      mockPrisma.virtualCard.update.mockResolvedValue({ ...card, status: 'FROZEN' });

      const result = await service.freezeCard('user-id', 'card-id');
      expect(mockPrisma.virtualCard.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FROZEN' } }),
      );
      expect(result).toHaveProperty('status', 'FROZEN');
    });
  });
});
