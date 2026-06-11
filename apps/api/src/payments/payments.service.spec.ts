import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';

// Mock Stripe constructor so no real HTTP calls are made
jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
  return { __esModule: true, default: MockStripe };
});

const mockPrisma = {
  wallet: { findUnique: jest.fn() },
  user: { findUnique: jest.fn().mockResolvedValue(null) },
  paymentOrder: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  transaction: { create: jest.fn() },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const vals: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    };
    return vals[key];
  }),
};

const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

const activeWallet = {
  id: 'wallet-id',
  userId: 'user-id',
  currency: 'USD',
  balance: 100,
  status: 'ACTIVE',
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: MailerService, useValue: { sendWithdrawalConfirmation: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ── createTopup ───────────────────────────────────────────────
  describe('createTopup', () => {
    it('throws BadRequestException when amount is below minimum', async () => {
      await expect(
        service.createTopup('user-id', { amount: 0.5 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when amount exceeds maximum', async () => {
      await expect(
        service.createTopup('user-id', { amount: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(
        service.createTopup('user-id', { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a PaymentIntent and records a PaymentOrder in the DB', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(activeWallet);
      mockPrisma.paymentOrder.create.mockResolvedValue({ id: 'order-id', stripePaymentIntentId: 'pi_test' });

      const result = await service.createTopup('user-id', { amount: 100 });

      expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ walletId: 'wallet-id' }) }),
      );
      expect(result).toHaveProperty('clientSecret', 'secret_test');
    });
  });
});
