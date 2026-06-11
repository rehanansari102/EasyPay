import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import Stripe from 'stripe';
import { toCents, MIN_TOPUP_AMOUNT, MAX_TOPUP_AMOUNT } from '@easypay/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mailer: MailerService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_placeholder',
      { apiVersion: '2024-06-20' },
    );
  }

  // ── Create Stripe PaymentIntent for wallet top-up ─────────────
  async createTopup(userId: string, dto: CreateTopupDto) {
    const amount = Number(dto.amount);

    if (amount < MIN_TOPUP_AMOUNT) {
      throw new BadRequestException(`Minimum top-up is $${MIN_TOPUP_AMOUNT}`);
    }
    if (amount > MAX_TOPUP_AMOUNT) {
      throw new BadRequestException(`Maximum top-up is $${MAX_TOPUP_AMOUNT}`);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: toCents(amount),
      currency: wallet.currency.toLowerCase(),
      metadata: { userId, walletId: wallet.id, amount: amount.toString() },
      automatic_payment_methods: { enabled: true },
    });

    // Record in DB
    await this.prisma.paymentOrder.create({
      data: {
        walletId: wallet.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: new Prisma.Decimal(amount),
        currency: wallet.currency,
        status: 'created',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: wallet.currency,
    };
  }

  // ── Stripe Webhook handler ────────────────────────────────────
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!order || order.status === 'succeeded') return;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'succeeded' },
      });

      await prisma.wallet.update({
        where: { id: order.walletId },
        data: { balance: { increment: order.amount } },
      });

      await prisma.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: order.amount,
          fee: 0,
          currency: order.currency,
          description: 'Wallet top-up via Stripe',
          receiverWalletId: order.walletId,
          metadata: { stripePaymentIntentId: intent.id },
        },
      });
    });

    // Notify user
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: order.walletId },
      select: { userId: true },
    });
    if (wallet) {
      await this.notifications.send(wallet.userId, {
        title: 'Top-up Successful',
        message: `$${order.amount} has been added to your wallet.`,
        type: 'TRANSACTION',
      });
    }

    this.logger.log(`Wallet topped up: ${order.walletId} +${order.amount}`);
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    await this.prisma.paymentOrder.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: 'failed' },
    });
    this.logger.warn(`Payment failed for intent: ${intent.id}`);
  }

  // ── Withdrawal ────────────────────────────────────────────────
  async requestWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const amount = Number(dto.amount);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.status !== 'ACTIVE') throw new ForbiddenException('Wallet is suspended');
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Use Stripe Payout (requires connected account or platform payout in live mode)
    // In test/dev mode we simulate via a Stripe Transfer to a bank account token
    const payout = await this.stripe.payouts.create(
      {
        amount: toCents(amount),
        currency: wallet.currency.toLowerCase(),
        metadata: {
          userId,
          walletId: wallet.id,
          bankAccountNumber: dto.bankAccountNumber.slice(-4), // store only last 4
          accountHolderName: dto.accountHolderName,
        },
        description: `EasyPay withdrawal for user ${userId}`,
        method: 'standard',
      },
      // In production you would use a connected account; for platform wallets
      // this runs against the platform's Stripe account balance
    ).catch(async (err) => {
      // Stripe payouts require real bank details in live mode.
      // In test mode we record a PENDING withdrawal and simulate success.
      this.logger.warn(`Stripe payout skipped (test mode or insufficient balance): ${err.message}`);
      return null;
    });

    // Deduct balance + create transaction atomically
    const result = await this.prisma.$transaction(async (prisma) => {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: new Prisma.Decimal(amount) } },
      });

      return prisma.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          status: payout ? 'COMPLETED' : 'PENDING',
          amount: new Prisma.Decimal(amount),
          fee: 0,
          currency: wallet.currency,
          description: `Withdrawal to account ending ****${dto.bankAccountNumber.slice(-4)}`,
          senderWalletId: wallet.id,
          metadata: {
            stripePayoutId: payout?.id ?? null,
            bankAccountLast4: dto.bankAccountNumber.slice(-4),
            accountHolderName: dto.accountHolderName,
          },
        },
      });
    });

    await this.notifications.send(userId, {
      title: 'Withdrawal Initiated',
      message: `$${amount.toFixed(2)} withdrawal to account ****${dto.bankAccountNumber.slice(-4)} is ${payout ? 'processing' : 'pending'}.`,
      type: 'TRANSACTION',
    });

    // Email confirmation (fire-and-forget)
    this.prisma.user
      .findUnique({ where: { id: userId }, select: { email: true, firstName: true } })
      .then((user) => {
        if (user) {
          this.mailer
            .sendWithdrawalConfirmation(user.email, user.firstName, {
              amount,
              currency: wallet.currency,
              bankLast4: dto.bankAccountNumber.slice(-4),
              reference: result.reference,
            })
            .catch(() => {/* non-critical */});
        }
      })
      .catch(() => {/* non-critical */});

    this.logger.log(`Withdrawal requested: wallet=${wallet.id} amount=${amount}`);
    return result;
  }
}
