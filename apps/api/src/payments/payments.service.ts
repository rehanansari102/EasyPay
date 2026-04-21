import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import Stripe from 'stripe';
import { toCents, MIN_TOPUP_AMOUNT, MAX_TOPUP_AMOUNT } from '@finvault/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
}
