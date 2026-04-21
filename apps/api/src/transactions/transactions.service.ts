import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransferDto } from './dto/transfer.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { TransactionDto, PaginatedTransactions } from '@finvault/shared';
import { calculateFee, MAX_TRANSFER_AMOUNT, MIN_TRANSFER_AMOUNT } from '@finvault/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notifications: NotificationsService,
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

    const receiverWallet = await this.walletService.getWalletByAccountNumber(dto.toAccountNumber);
    if (receiverWallet.status !== 'ACTIVE') throw new BadRequestException('Recipient wallet is not active');

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
