import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';
import { TransferDto } from './dto/transfer.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { TransactionDto, PaginatedTransactions } from '@easypay/shared';
import { calculateFee, MAX_TRANSFER_AMOUNT, MIN_TRANSFER_AMOUNT, DAILY_TRANSFER_LIMIT } from '@easypay/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notifications: NotificationsService,
    private mailer: MailerService,
  ) {}

  // ── Transfer ──────────────────────────────────────────────────
  async transfer(userId: string, dto: TransferDto): Promise<TransactionDto> {
    const amount = Number(dto.amount);

    if (amount < MIN_TRANSFER_AMOUNT) {
      throw new BadRequestException(`Minimum transfer is $${MIN_TRANSFER_AMOUNT}`);
    }
    if (amount > MAX_TRANSFER_AMOUNT) {
      throw new BadRequestException(`Maximum single transfer is $${MAX_TRANSFER_AMOUNT}`);
    }

    const senderWallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!senderWallet) throw new NotFoundException('Sender wallet not found');
    if (senderWallet.status !== 'ACTIVE') throw new ForbiddenException('Wallet is suspended');

    if (senderWallet.accountNumber === dto.toAccountNumber) {
      throw new BadRequestException('Cannot transfer to your own wallet');
    }

    // ── Daily transfer limit check ────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailyTotal = await this.prisma.transaction.aggregate({
      where: {
        senderWalletId: senderWallet.id,
        type: 'TRANSFER',
        status: 'COMPLETED',
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true },
    });
    const sentToday = Number(dailyTotal._sum.amount ?? 0);
    if (sentToday + amount > DAILY_TRANSFER_LIMIT) {
      throw new BadRequestException(
        `Daily transfer limit of $${DAILY_TRANSFER_LIMIT.toLocaleString()} exceeded. ` +
        `You have sent $${sentToday.toFixed(2)} today.`,
      );
    }

    const receiverWallet = await this.walletService.getWalletByAccountNumber(dto.toAccountNumber);
    if (receiverWallet.status !== 'ACTIVE') throw new BadRequestException('Recipient wallet is not active');

    // ── Virtual card spending limit check ─────────────────────
    if (dto.cardId) {
      const card = await this.prisma.virtualCard.findFirst({
        where: { id: dto.cardId, walletId: senderWallet.id },
      });
      if (!card) throw new NotFoundException('Virtual card not found');
      if (card.status !== 'ACTIVE') throw new ForbiddenException('Card is not active');

      if (card.spendingLimit !== null) {
        const cardSpentToday = await this.prisma.transaction.aggregate({
          where: {
            senderWalletId: senderWallet.id,
            type: 'TRANSFER',
            status: 'COMPLETED',
            metadata: { path: ['cardId'], equals: dto.cardId },
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          _sum: { amount: true },
        });
        const spentToday = Number(cardSpentToday._sum.amount ?? 0);
        if (spentToday + amount > Number(card.spendingLimit)) {
          throw new BadRequestException(
            `Card spending limit of $${Number(card.spendingLimit).toFixed(2)}/day exceeded`,
          );
        }
      }
    }

    const fee = calculateFee(amount);
    const totalDeduction = amount + fee;

    if (Number(senderWallet.balance) < totalDeduction) {
      throw new BadRequestException('Insufficient balance');
    }

    // ── Atomic transaction using Prisma $transaction ──────────
    const tx = await this.prisma.$transaction(async (prisma) => {
      await prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: new Prisma.Decimal(totalDeduction) } },
      });

      await prisma.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: new Prisma.Decimal(amount) } },
      });

      return prisma.transaction.create({
        data: {
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: new Prisma.Decimal(amount),
          fee: new Prisma.Decimal(fee),
          currency: senderWallet.currency,
          description: dto.description,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
          ...(dto.cardId && { metadata: { cardId: dto.cardId } }),
        },
      });
    });

    // ── Notify both parties ───────────────────────────────────
    await this.notifications.send(userId, {
      title: 'Transfer Sent',
      message: `$${amount} sent successfully. Fee: $${fee}`,
      type: 'TRANSACTION',
    });

    await this.notifications.send(receiverWallet.userId, {
      title: 'Money Received',
      message: `You received $${amount} in your wallet.`,
      type: 'TRANSACTION',
    });

    // ── Email receipts (fire-and-forget) ─────────────────────
    this.prisma.user
      .findMany({
        where: { id: { in: [userId, receiverWallet.userId] } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      .then((users) => {
        const sender = users.find((u) => u.id === userId);
        const receiver = users.find((u) => u.id === receiverWallet.userId);
        const recipientName = receiver
          ? `${receiver.firstName} ${receiver.lastName}`
          : 'Recipient';
        const senderName = sender
          ? `${sender.firstName} ${sender.lastName}`
          : 'Sender';

        if (sender) {
          this.mailer
            .sendTransactionReceipt(sender.email, sender.firstName, {
              direction: 'sent',
              amount,
              currency: senderWallet.currency,
              fee,
              counterpartyName: recipientName,
              reference: tx.reference,
              description: dto.description,
              timestamp: tx.createdAt,
            })
            .catch(() => {/* non-critical */});
        }
        if (receiver) {
          this.mailer
            .sendTransactionReceipt(receiver.email, receiver.firstName, {
              direction: 'received',
              amount,
              currency: senderWallet.currency,
              counterpartyName: senderName,
              reference: tx.reference,
              description: dto.description,
              timestamp: tx.createdAt,
            })
            .catch(() => {/* non-critical */});
        }
      })
      .catch(() => {/* non-critical */});

    return this.toDto(tx);
  }

  // ── Transaction history ───────────────────────────────────────
  async getHistory(userId: string, filters: TransactionFiltersDto): Promise<PaginatedTransactions> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const { page = 1, limit = 20, type, status, from, to } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
      ...(type && { type }),
      ...(status && { status }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map(this.toDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(userId: string, txId: string): Promise<TransactionDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const tx = await this.prisma.transaction.findFirst({
      where: {
        id: txId,
        OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
      },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.toDto(tx);
  }

  // ── CSV export ────────────────────────────────────────────────
  async exportCsv(userId: string, filters: TransactionFiltersDto): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const { type, status, from, to } = filters;
    const where: Prisma.TransactionWhereInput = {
      OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
      ...(type && { type }),
      ...(status && { status }),
      ...(from || to ? { createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      }} : {}),
    };

    const rows = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // safety cap
    });

    const header = 'Date,Type,Status,Amount,Fee,Currency,Description,Direction\n';
    const lines = rows.map((tx) => {
      const direction = tx.senderWalletId === wallet.id ? 'DEBIT' : 'CREDIT';
      const description = (tx.description ?? '').replace(/,/g, ' ');
      return [
        tx.createdAt.toISOString(),
        tx.type,
        tx.status,
        tx.amount.toString(),
        tx.fee.toString(),
        tx.currency,
        description,
        direction,
      ].join(',');
    });

    return header + lines.join('\n');
  }

  toDto(tx: any): TransactionDto {
    return {
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      status: tx.status,
      amount: tx.amount.toString(),
      fee: tx.fee.toString(),
      currency: tx.currency,
      description: tx.description,
      senderWalletId: tx.senderWalletId,
      receiverWalletId: tx.receiverWalletId,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}
