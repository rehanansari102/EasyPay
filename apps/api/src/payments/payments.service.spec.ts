import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    transfers: {
      create: jest.fn().mockResolvedValue({ id: 'tr_test' }),
    },
  }));
  return { __esModule: true, default: MockStripe };
});

const mockPrisma = {
  wallet: { findUnique: jest.fn() },
  user: { findUnique: jest.fn().mockResolvedValue({ email: 'test@example.com', firstName: 'Test' }) },
  paymentOrder: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  transaction: { create: jest.fn() },
  $transaction: jest.fn(),
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
const mockMailer = {
  sendWithdrawalConfirmation: jest.fn().mockResolvedValue(undefined),
};

const activeWallet = {
  id: 'wallet-id',
  userId: 'user-id',
  currency: 'USD',
  balance: 500,
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
        { provide: MailerService, useValue: mockMailer },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ── createTopup ───────────────────────────────────────────────
  describe('createTopup', () => {
    it('throws BadRequestException when amount is below minimum', async () => {
      await expect(service.createTopup('user-id', { amount: 0.5 })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when amount exceeds maximum', async () => {
      await expect(service.createTopup('user-id', { amount: 99999 })).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.createTopup('user-id', { amount: 100 })).rejects.toThrow(NotFoundException);
    });

    it('creates a PaymentIntent and records a PaymentOrder', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(activeWallet);
      mockPrisma.paymentOrder.create.mockResolvedValue({ id: 'order-id', stripePaymentIntentId: 'pi_test' });

      const result = await service.createTopup('user-id', { amount: 100 });

      expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ walletId: 'wallet-id' }) }),
      );
      expect(result).toHaveProperty('clientSecret', 'secret_test');
    });

    it('returns amount and currency in response', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(activeWallet);
      mockPrisma.paymentOrder.create.mockResolvedValue({ id: 'order-id' });

      const result = await service.createTopup('user-id', { amount: 250 });

      expect(result).toHaveProperty('amount', 250);
      expect(result).toHaveProperty('currency', 'USD');
    });
  });

  // ── handleWebhook ─────────────────────────────────────────────
  describe('handleWebhook', () => {
    it('throws BadRequestException when signature verification fails', async () => {
      const Stripe = (await import('stripe')).default as any;
      const stripeInstance = new Stripe();
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('body'), 'bad-signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips processing when PaymentOrder is already succeeded', async () => {
      const Stripe = (await import('stripe')).default as any;
      const stripeInstance = new Stripe();
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test', metadata: { walletId: 'wallet-id', amount: '100', userId: 'user-id' } } },
      });

      mockPrisma.paymentOrder.findUnique.mockResolvedValue({ id: 'order-id', status: 'succeeded' });

      await service.handleWebhook(Buffer.from('body'), 'valid-sig');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── requestWithdrawal ─────────────────────────────────────────
  describe('requestWithdrawal', () => {
    const withdrawalDto = {
      amount: 100,
      bankAccountNumber: '1234567890',
      bankName: 'Test Bank',
      accountHolderName: 'Test User',
    };

    it('throws NotFoundException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.requestWithdrawal('user-id', withdrawalDto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when wallet is not ACTIVE', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ...activeWallet, status: 'SUSPENDED' });

      await expect(service.requestWithdrawal('user-id', withdrawalDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when balance is insufficient', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ...activeWallet, balance: 50 });

      await expect(service.requestWithdrawal('user-id', { ...withdrawalDto, amount: 100 })).rejects.toThrow(BadRequestException);
    });
  });
});
