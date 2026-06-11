import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse, JwtPayload } from '@easypay/shared';
import { CACHE_TTL, MAX_LOGIN_ATTEMPTS, REDIS_KEYS } from '@easypay/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
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

    // Clear any pre-registration login lockout for this email
    await Promise.all([
      this.cache.del(REDIS_KEYS.LOGIN_ATTEMPTS(dto.email)),
      this.cache.del(REDIS_KEYS.LOGIN_LOCKOUT(dto.email)),
    ]);

    // Send email verification (non-blocking — don't fail registration if email fails)
    this.sendVerificationEmail(user.id, user.email, user.firstName).catch(() => {});

    return this.generateAuthResponse(user);
  }

  // ── Email Verification ─────────────────────────────────────────
  async sendVerificationEmail(userId: string, email: string, firstName: string) {
    const token = crypto.randomBytes(32).toString('hex');
    await this.cache.set(
      REDIS_KEYS.EMAIL_VERIFY(token),
      userId,
      CACHE_TTL.EMAIL_VERIFY * 1000,
    );
    await this.mailerService.sendEmailVerification(email, firstName, token);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.cache.get<string>(REDIS_KEYS.EMAIL_VERIFY(token));
    if (!userId) throw new BadRequestException('Invalid or expired verification token');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) {
      await this.cache.del(REDIS_KEYS.EMAIL_VERIFY(token));
      return { message: 'Email already verified' };
    }

    await this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await this.cache.del(REDIS_KEYS.EMAIL_VERIFY(token));

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const safeMessage = 'If that email is registered and unverified, a new link has been sent';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return { message: safeMessage };

    await this.sendVerificationEmail(user.id, user.email, user.firstName);
    return { message: safeMessage };
  }

  // ── Validate credentials (used by LocalStrategy) ──────────────
  async validateCredentials(email: string, password: string) {
    // Check lockout before touching DB
    const isLocked = await this.cache.get<string>(REDIS_KEYS.LOGIN_LOCKOUT(email));
    if (isLocked) {
      throw new HttpException(
        'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      await this.recordFailedAttempt(email);
      return null;
    }
    if (!user.isActive) throw new ForbiddenException('Account suspended');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.recordFailedAttempt(email, user.firstName);
      return null;
    }

    // Clear failed attempts on success
    await Promise.all([
      this.cache.del(REDIS_KEYS.LOGIN_ATTEMPTS(email)),
      this.cache.del(REDIS_KEYS.LOGIN_LOCKOUT(email)),
    ]);

    return user;
  }

  private async recordFailedAttempt(email: string, firstName?: string) {
    const attemptsKey = REDIS_KEYS.LOGIN_ATTEMPTS(email);
    const attempts = (await this.cache.get<number>(attemptsKey) ?? 0) + 1;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await this.cache.set(REDIS_KEYS.LOGIN_LOCKOUT(email), '1', CACHE_TTL.LOGIN_LOCKOUT * 1000);
      await this.cache.del(attemptsKey);
      if (firstName) {
        this.mailerService.sendAccountLockedAlert(email, firstName).catch(() => {});
      }
    } else {
      await this.cache.set(attemptsKey, attempts, CACHE_TTL.LOGIN_LOCKOUT * 1000);
    }
  }

  // ── Login ─────────────────────────────────────────────────────
  async login(user: any): Promise<AuthResponse | { requires2fa: true; tempSessionId: string }> {
    if (user.twoFaEnabled) {
      const tempSessionId = uuidv4();
      await this.cache.set(
        REDIS_KEYS.TWO_FA_PENDING(tempSessionId),
        user.id,
        CACHE_TTL.TWO_FA_PENDING * 1000,
      );
      return { requires2fa: true as const, tempSessionId };
    }

    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'USER_LOGIN' } });
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

  // ── Forgot / Reset Password ───────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const safeMessage = 'If that email is registered, a password reset link has been sent';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { message: safeMessage };

    const token = crypto.randomBytes(32).toString('hex');
    await this.cache.set(
      REDIS_KEYS.PASSWORD_RESET(token),
      user.id,
      CACHE_TTL.PASSWORD_RESET * 1000,
    );
    this.mailerService.sendPasswordReset(user.email, user.firstName, token).catch(() => {});

    return { message: safeMessage };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const userId = await this.cache.get<string>(REDIS_KEYS.PASSWORD_RESET(token));
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Invalidate reset token + active refresh token (force re-login)
    await Promise.all([
      this.cache.del(REDIS_KEYS.PASSWORD_RESET(token)),
      this.cache.del(REDIS_KEYS.REFRESH_TOKEN(userId)),
    ]);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ── Two-Factor Authentication ─────────────────────────────────
  async generateTwoFactorSecret(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFaEnabled) throw new BadRequestException('2FA is already enabled');

    const secret = generateSecret();
    const appName = this.configService.get<string>('APP_NAME', 'EasyPay');
    const otpauthUrl = generateURI({ issuer: appName, label: user.email, secret });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Store the pending setup secret temporarily (only saved to DB after user confirms)
    await this.cache.set(
      REDIS_KEYS.TWO_FA_SETUP(userId),
      secret,
      CACHE_TTL.TWO_FA_SETUP * 1000,
    );

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, code: string): Promise<{ message: string }> {
    const pendingSecret = await this.cache.get<string>(REDIS_KEYS.TWO_FA_SETUP(userId));
    if (!pendingSecret) {
      throw new BadRequestException(
        'No 2FA setup in progress. Please generate a QR code first.',
      );
    }

    const isValid = verifySync({ token: code, secret: pendingSecret }).valid;
    if (!isValid) throw new BadRequestException('Invalid TOTP code. Please try again.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: pendingSecret, twoFaEnabled: true },
    });
    await this.cache.del(REDIS_KEYS.TWO_FA_SETUP(userId));
    await this.prisma.auditLog.create({ data: { userId, action: 'TWO_FA_ENABLED' } });

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.twoFaEnabled || !user.twoFaSecret) {
      throw new BadRequestException('2FA is not enabled on this account');
    }

    const isValid = verifySync({ token: code, secret: user.twoFaSecret }).valid;
    if (!isValid) throw new BadRequestException('Invalid TOTP code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: null, twoFaEnabled: false },
    });
    await this.prisma.auditLog.create({ data: { userId, action: 'TWO_FA_DISABLED' } });

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verifyTwoFactorAndLogin(tempSessionId: string, code: string): Promise<AuthResponse> {
    const userId = await this.cache.get<string>(REDIS_KEYS.TWO_FA_PENDING(tempSessionId));
    if (!userId) {
      throw new UnauthorizedException(
        'Invalid or expired 2FA session. Please log in again.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');
    if (!user.twoFaEnabled || !user.twoFaSecret) {
      throw new BadRequestException('2FA is not configured for this account');
    }

    const isValid = verifySync({ token: code, secret: user.twoFaSecret }).valid;
    if (!isValid) throw new UnauthorizedException('Invalid TOTP code');

    await this.cache.del(REDIS_KEYS.TWO_FA_PENDING(tempSessionId));
    await this.prisma.auditLog.create({ data: { userId, action: 'USER_LOGIN' } });

    return this.generateAuthResponse(user);
  }

  // ── Token generation helpers ──────────────────────────────────
  private async generateAuthResponse(user: any): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')) as any,
    });

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('Password change unavailable for OAuth accounts');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

    await this.prisma.auditLog.create({ data: { userId, action: 'USER_CHANGED_PASSWORD' } });

    return { message: 'Password changed successfully' };
  }
}
