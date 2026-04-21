import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse, JwtPayload } from '@finvault/shared';
import { CACHE_TTL, REDIS_KEYS } from '@finvault/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // ── Registration ──────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const accountNumber = this.generateAccountNumber();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        wallet: {
          create: { accountNumber, currency: 'USD', balance: 0 },
        },
      },
    });

    return this.generateAuthResponse(user);
  }

  // ── Validate credentials (used by LocalStrategy) ──────────────
  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    if (!user.isActive) throw new ForbiddenException('Account suspended');

    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  // ── Login ─────────────────────────────────────────────────────
  async login(user: any): Promise<AuthResponse> {
    // Log audit
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'USER_LOGIN' },
    });
    return this.generateAuthResponse(user);
  }

  // ── Refresh token ─────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string): Promise<AuthResponse> {
    // Validate token from cache
    const cachedToken = await this.cache.get<string>(REDIS_KEYS.REFRESH_TOKEN(userId));
    if (!cachedToken || cachedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    // Rotate: invalidate old, issue new
    await this.cache.del(REDIS_KEYS.REFRESH_TOKEN(userId));
    return this.generateAuthResponse(user);
  }

  // ── Logout ────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.cache.del(REDIS_KEYS.REFRESH_TOKEN(userId));
  }

  // ── Google OAuth upsert ───────────────────────────────────────
  async handleGoogleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> {
    let user = await this.prisma.user.findUnique({ where: { googleId: googleUser.googleId } });

    if (!user) {
      // Check if email exists (link accounts)
      user = await this.prisma.user.findUnique({ where: { email: googleUser.email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId, emailVerified: true },
        });
      } else {
        const accountNumber = this.generateAccountNumber();
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatarUrl: googleUser.avatarUrl,
            emailVerified: true,
            wallet: { create: { accountNumber, currency: 'USD', balance: 0 } },
          },
        });
      }
    }

    return this.generateAuthResponse(user);
  }

  // ── Token generation helpers ──────────────────────────────────
  private async generateAuthResponse(user: any): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Store refresh token in Redis with 7-day TTL
    await this.cache.set(
      REDIS_KEYS.REFRESH_TOKEN(user.id),
      refreshToken,
      CACHE_TTL.REFRESH_TOKEN * 1000,
    );

    const userDto = this.usersService.toDto(user);

    return {
      user: userDto,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    };
  }

  private generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}
