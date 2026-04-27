import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Users ─────────────────────────────────────────────────────

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          kycStatus: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          wallet: { select: { balance: true, currency: true, accountNumber: true, status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        kycDocument: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Resolve R2 object keys to short-lived presigned URLs
    if (user.kycDocument) {
      const doc = user.kycDocument as any;
      doc.frontImageUrl = await this.storage.getPresignedUrl(doc.frontImageUrl);
      if (doc.backImageUrl) doc.backImageUrl = await this.storage.getPresignedUrl(doc.backImageUrl);
      if (doc.selfieUrl) doc.selfieUrl = await this.storage.getPresignedUrl(doc.selfieUrl);
    }

    return user;
  }

  async toggleUserActive(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new BadRequestException('Cannot suspend an admin account');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: isActive ? 'ADMIN_ACTIVATED_USER' : 'ADMIN_SUSPENDED_USER',
      },
    });

    return updated;
  }

  async updateKycStatus(userId: string, kycStatus: 'APPROVED' | 'REJECTED', notes?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus },
      select: { id: true, email: true, kycStatus: true },
    });

    const kycDoc = await this.prisma.kycDocument.findUnique({ where: { userId } });
    if (kycDoc) {
      await this.prisma.kycDocument.update({
        where: { userId },
        data: { reviewedAt: new Date(), reviewNotes: notes },
      });
    }

    await this.prisma.auditLog.create({
      data: { userId, action: `ADMIN_KYC_${kycStatus}` },
    });

    return updated;
  }

  // ── KYC Review ──────────────────────────────────────────────

  async getKycSubmissions(page = 1, limit = 20, status = 'SUBMITTED') {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.kycDocument.findMany({
        where: { user: { kycStatus: status as any } },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true },
          },
        },
      }),
      this.prisma.kycDocument.count({ where: { user: { kycStatus: status as any } } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getKycDocument(userId: string) {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, kycStatus: true } },
      },
    });
    if (!doc) throw new NotFoundException('KYC document not found');

    return {
      ...doc,
      frontImageUrl: await this.storage.getPresignedUrl(doc.frontImageUrl),
      backImageUrl: doc.backImageUrl ? await this.storage.getPresignedUrl(doc.backImageUrl) : null,
      selfieUrl: doc.selfieUrl ? await this.storage.getPresignedUrl(doc.selfieUrl) : null,
    };
  }

  // ── Wallets ───────────────────────────────────────────────────

  async getWallets(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.wallet.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async toggleWalletStatus(walletId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const updated = await this.prisma.wallet.update({
      where: { id: walletId },
      data: { status },
      select: { id: true, accountNumber: true, status: true, userId: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: wallet.userId,
        action: status === 'SUSPENDED' ? 'ADMIN_WALLET_SUSPENDED' : 'ADMIN_WALLET_ACTIVATED',
      },
    });

    return updated;
  }

  // ── Transactions ──────────────────────────────────────────────

  async getAllTransactions(page = 1, limit = 20, status?: string, type?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.TransactionWhereInput = {
      ...(status && { status: status as any }),
      ...(type && { type: type as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          senderWallet: { include: { user: { select: { email: true } } } },
          receiverWallet: { include: { user: { select: { email: true } } } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reverseTransaction(txId: string, adminId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: txId },
      include: { senderWallet: true, receiverWallet: true },
    });

    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'COMPLETED') throw new BadRequestException('Only completed transactions can be reversed');
    if (tx.type !== 'TRANSFER') throw new BadRequestException('Only transfers can be reversed');
    if (!tx.senderWalletId || !tx.receiverWalletId) throw new BadRequestException('Invalid transaction');

    const reversal = await this.prisma.$transaction(async (prisma) => {
      // Refund sender
      await prisma.wallet.update({
        where: { id: tx.senderWalletId! },
        data: { balance: { increment: tx.amount } },
      });

      // Deduct from receiver
      await prisma.wallet.update({
        where: { id: tx.receiverWalletId! },
        data: { balance: { decrement: tx.amount } },
      });

      // Mark original as reversed
      await prisma.transaction.update({
        where: { id: txId },
        data: { status: 'REVERSED' },
      });

      // Create reversal record
      return prisma.transaction.create({
        data: {
          type: 'REVERSAL',
          status: 'COMPLETED',
          amount: tx.amount,
          fee: 0,
          currency: tx.currency,
          description: `Reversal of transaction ${tx.reference}`,
          senderWalletId: tx.receiverWalletId,
          receiverWalletId: tx.senderWalletId,
          reversedById: txId,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `ADMIN_REVERSED_TRANSACTION:${txId}`,
      },
    });

    return reversal;
  }

  // ── Audit Logs ────────────────────────────────────────────────

  async getAuditLogs(page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = userId ? { userId } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Stats ─────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      totalVolume,
      pendingKyc,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      this.prisma.transaction.aggregate({
        where: { status: 'COMPLETED', type: 'TRANSFER' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { kycStatus: 'SUBMITTED' } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalTransactions,
      totalVolume: totalVolume._sum.amount?.toString() ?? '0',
      pendingKyc,
    };
  }
}
