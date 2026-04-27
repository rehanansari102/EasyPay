import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from '@easypay/shared';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function mimeToExt(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const dto_ = this.toDto(user);
    dto_.avatarUrl = await this.resolveAvatarUrl(user.avatarUrl);
    return dto_;
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.findById(userId);
    const dto = this.toDto(user);
    dto.avatarUrl = await this.resolveAvatarUrl(user.avatarUrl);
    return dto;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserDto> {
    if (!file) throw new BadRequestException('avatar file is required');
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Avatar must be JPEG, PNG, or WebP (got ${file.mimetype})`,
      );
    }

    // Delete previous avatar if it was an R2-managed key
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl && !existing.avatarUrl.startsWith('https://')) {
      await this.storage.delete(existing.avatarUrl).catch(() => undefined);
    }

    const key = await this.storage.upload(
      `avatars/${userId}/avatar.${mimeToExt(file.mimetype)}`,
      file.buffer,
      file.mimetype,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: key },
      include: { wallet: true },
    });

    const dto = this.toDto(user);
    dto.avatarUrl = await this.resolveAvatarUrl(key);
    return dto;
  }

  // ── Admin: list all users ─────────────────────────────────────
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, kycStatus: true, isActive: true, createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Helpers ───────────────────────────────────────────────────

  /** R2 keys do not start with https:// — resolve them to presigned URLs. */
  private async resolveAvatarUrl(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith('https://')) return url; // external URL (e.g. Google)
    return this.storage.getPresignedUrl(url);
  }

  toDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      kycStatus: user.kycStatus,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFaEnabled: user.twoFaEnabled,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
