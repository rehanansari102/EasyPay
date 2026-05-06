import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletDto, VirtualCardDto } from '@easypay/shared';
import { CreateVirtualCardDto } from './dto/create-virtual-card.dto';
import { CryptoService } from '../common/crypto.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  async getWallet(userId: string): Promise<WalletDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return this.toDto(wallet);
  }

  async getWalletByAccountNumber(accountNumber: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { accountNumber } });
    if (!wallet) throw new NotFoundException('Account not found');
    return wallet;
  }

  // ── Virtual Cards ─────────────────────────────────────────────
  async getVirtualCards(userId: string): Promise<VirtualCardDto[]> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const cards = await this.prisma.virtualCard.findMany({ where: { walletId: wallet.id } });
    return cards.map(this.cardToDto);
  }

  async createVirtualCard(userId: string, dto: CreateVirtualCardDto): Promise<VirtualCardDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.status !== 'ACTIVE') throw new ForbiddenException('Wallet is not active');

    const now = new Date();
    const expiryYear = now.getFullYear() + 3;
    const expiryMonth = now.getMonth() + 1;

    // Encrypt card number and CVV before storing
    const cardNumber = this.generateCardNumber();
    const cvv = this.generateCvv();
    const encryptedCardNumber = this.crypto.encrypt(cardNumber);
    const encryptedCvv = this.crypto.encrypt(cvv);

    const card = await this.prisma.virtualCard.create({
      data: {
        walletId: wallet.id,
        cardNumber: encryptedCardNumber,
        cvv: encryptedCvv,
        expiryMonth,
        expiryYear,
        nameOnCard: dto.nameOnCard,
        spendingLimit: dto.spendingLimit,
      },
    });

    return this.cardToDto(card);
  }

  async freezeCard(userId: string, cardId: string): Promise<VirtualCardDto> {
    const card = await this.validateCardOwnership(userId, cardId);
    const updated = await this.prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' },
    });
    return this.cardToDto(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────
  private async validateCardOwnership(userId: string, cardId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const card = await this.prisma.virtualCard.findFirst({
      where: { id: cardId, walletId: wallet.id },
    });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  private generateCardNumber(): string {
    const groups = Array.from({ length: 4 }, () =>
      Math.floor(1000 + Math.random() * 9000).toString(),
    );
    return groups.join('');
  }

  private generateCvv(): string {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  toDto(wallet: any): WalletDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance.toString(),
      currency: wallet.currency,
      status: wallet.status,
      accountNumber: wallet.accountNumber,
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  cardToDto(card: any): VirtualCardDto {
    // Decrypt to get last 4 digits for display; never expose full number in DTO
    let last4 = '0000';
    try {
      const decrypted = this.crypto.decrypt(card.cardNumber);
      last4 = decrypted.slice(-4);
    } catch {
      // Already plain (legacy unencrypted) or invalid — fallback to raw last4
      last4 = card.cardNumber.slice(-4);
    }
    return {
      id: card.id,
      walletId: card.walletId,
      cardNumberMasked: `**** **** **** ${last4}`,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      nameOnCard: card.nameOnCard,
      status: card.status,
    };
  }
}
