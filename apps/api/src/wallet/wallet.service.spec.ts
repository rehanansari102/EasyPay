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
    delete: jest.fn(),
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

const baseCard = {
  id: 'card-id',
  walletId: wallet.id,
  cardNumber: 'enc:4111111111111111',
  cvv: 'enc:123',
  status: 'ACTIVE',
  expiryMonth: 1,
  expiryYear: 2026,
  nameOnCard: 'Test User',
  spendingLimit: null,
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

  // ── getVirtualCards ───────────────────────────────────────────
  describe('getVirtualCards', () => {
    it('returns masked card list', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findMany.mockResolvedValue([baseCard]);

      const result = await service.getVirtualCards('user-id');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('cardNumberMasked');
    });

    it('throws NotFoundException when wallet not found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getVirtualCards('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('decrypts card number to produce masked output', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findMany.mockResolvedValue([baseCard]);

      const result = await service.getVirtualCards('user-id');

      expect(mockCrypto.decrypt).toHaveBeenCalled();
      expect(result[0].cardNumberMasked).toMatch(/\*+/);
    });
  });

  // ── createVirtualCard ─────────────────────────────────────────
  describe('createVirtualCard', () => {
    const dto = { nameOnCard: 'Test User', spendingLimit: 1000 };

    it('encrypts card number and CVV before persisting', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.create.mockImplementation(async ({ data }) => ({
        ...baseCard,
        walletId: data.walletId,
        cardNumber: data.cardNumber,
        cvv: data.cvv,
        nameOnCard: data.nameOnCard,
        spendingLimit: data.spendingLimit,
      }));

      await service.createVirtualCard('user-id', dto);

      expect(mockCrypto.encrypt).toHaveBeenCalledTimes(2);
    });

    it('returns DTO with masked card number', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.create.mockResolvedValue(baseCard);

      const result = await service.createVirtualCard('user-id', dto);

      expect(result).toHaveProperty('cardNumberMasked');
    });

    it('throws ForbiddenException if wallet is not ACTIVE', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ...wallet, status: 'FROZEN' });

      await expect(service.createVirtualCard('user-id', dto)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.virtualCard.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.createVirtualCard('user-id', dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── freezeCard ────────────────────────────────────────────────
  describe('freezeCard', () => {
    it('toggles card status from ACTIVE to FROZEN', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue(baseCard);
      mockPrisma.virtualCard.update.mockResolvedValue({ ...baseCard, status: 'FROZEN' });

      const result = await service.freezeCard('user-id', 'card-id');

      expect(mockPrisma.virtualCard.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FROZEN' } }),
      );
      expect(result).toHaveProperty('status', 'FROZEN');
    });

    it('toggles card status from FROZEN back to ACTIVE', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue({ ...baseCard, status: 'FROZEN' });
      mockPrisma.virtualCard.update.mockResolvedValue({ ...baseCard, status: 'ACTIVE' });

      const result = await service.freezeCard('user-id', 'card-id');

      expect(mockPrisma.virtualCard.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
      expect(result).toHaveProperty('status', 'ACTIVE');
    });

    it('throws NotFoundException if card does not belong to wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue(null);

      await expect(service.freezeCard('user-id', 'other-card')).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteCard ────────────────────────────────────────────────
  describe('deleteCard', () => {
    it('deletes an active card successfully', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue(baseCard);
      mockPrisma.virtualCard.delete.mockResolvedValue(baseCard);

      await expect(service.deleteCard('user-id', 'card-id')).resolves.toBeUndefined();
      expect(mockPrisma.virtualCard.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'card-id' } }),
      );
    });

    it('throws NotFoundException if card does not belong to wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.virtualCard.findFirst.mockResolvedValue(null);

      await expect(service.deleteCard('user-id', 'other-card')).rejects.toThrow(NotFoundException);
    });
  });
});
