import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-secret'),
};

const mockMailer = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountLockedAlert: jest.fn().mockResolvedValue(undefined),
};

const mockUsers = {
  findById: jest.fn(),
  toDto: jest.fn((u: any) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
  })),
};

const baseUser = {
  id: 'user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  isEmailVerified: false,
  twoFaEnabled: false,
  isActive: true,
  kycStatus: 'PENDING',
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailerService, useValue: mockMailer },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ──────────────────────────────────────────────────
  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password1!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('throws BadRequestException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a user and returns auth response when email is new', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...baseUser, email: dto.email });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: dto.email }) }),
      );
      expect(result).toHaveProperty('tokens.accessToken');
      expect(result).toHaveProperty('user');
    });

    it('hashes the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => {
        const isHashed = await bcrypt.compare(dto.password, data.passwordHash);
        expect(isHashed).toBe(true);
        return { ...baseUser, email: dto.email };
      });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      await service.register(dto);
    });

    it('clears any login lockout for the email on successful register', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...baseUser });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      await service.register(dto);

      expect(mockCache.del).toHaveBeenCalledTimes(2);
    });

    it('returns both accessToken and refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...baseUser });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result.tokens.accessToken).toBe('signed-token');
      expect(result.tokens.refreshToken).toBe('signed-token');
    });
  });

  // ── validateCredentials ───────────────────────────────────────
  describe('validateCredentials', () => {
    it('throws 429 when account is locked out', async () => {
      mockCache.get.mockResolvedValueOnce('1');

      await expect(service.validateCredentials('test@example.com', 'any')).rejects.toThrow(HttpException);
    });

    it('returns null and records failed attempt when user not found', async () => {
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.validateCredentials('unknown@example.com', 'pass');

      expect(result).toBeNull();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('returns null when password is wrong', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });

      const result = await service.validateCredentials('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('returns user when credentials are valid', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.validateCredentials('test@example.com', 'Password1!');

      expect(result).toHaveProperty('id', 'user-id');
    });

    it('throws ForbiddenException when account is suspended', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false, passwordHash: hash });

      await expect(service.validateCredentials('test@example.com', 'Password1!')).rejects.toThrow(ForbiddenException);
    });

    it('clears failed attempts on successful login', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      mockCache.del.mockResolvedValue(undefined);

      await service.validateCredentials('test@example.com', 'Password1!');

      expect(mockCache.del).toHaveBeenCalledTimes(2);
    });
  });

  // ── login ─────────────────────────────────────────────────────
  describe('login', () => {
    it('returns auth response when 2FA is not enabled', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.login({ ...baseUser, twoFaEnabled: false });

      expect(result).toHaveProperty('tokens');
    });

    it('returns requires2fa flag and tempSessionId when 2FA is enabled', async () => {
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.login({ ...baseUser, twoFaEnabled: true });

      expect(result).toHaveProperty('requires2fa', true);
      expect(result).toHaveProperty('tempSessionId');
    });

    it('does not create audit log when 2FA is pending', async () => {
      mockCache.set.mockResolvedValue(undefined);

      await service.login({ ...baseUser, twoFaEnabled: true });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────
  describe('refreshTokens', () => {
    it('throws UnauthorizedException when refresh token is not in cache', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.refreshTokens('user-id', 'old-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token does not match cached value', async () => {
      mockCache.get.mockResolvedValue('different-token');

      await expect(service.refreshTokens('user-id', 'old-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user no longer exists', async () => {
      mockCache.get.mockResolvedValue('valid-token');
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('user-id', 'valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates the refresh token and returns new tokens', async () => {
      mockCache.get.mockResolvedValue('valid-token');
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.refreshTokens('user-id', 'valid-token');

      expect(mockCache.del).toHaveBeenCalledWith(expect.stringContaining('user-id'));
      expect(result).toHaveProperty('tokens.accessToken', 'signed-token');
    });
  });

  // ── logout ────────────────────────────────────────────────────
  describe('logout', () => {
    it('deletes the refresh token from cache', async () => {
      mockCache.del.mockResolvedValue(undefined);

      await service.logout('user-id');

      expect(mockCache.del).toHaveBeenCalledTimes(1);
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('throws BadRequestException for invalid or expired token', async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('marks email as verified and clears the token', async () => {
      mockCache.get.mockResolvedValue('user-id');
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, emailVerified: false });
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, emailVerified: true });
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { emailVerified: true } }),
      );
      expect(result.message).toContain('verified');
      expect(mockCache.del).toHaveBeenCalled();
    });

    it('returns already verified message without updating DB', async () => {
      mockCache.get.mockResolvedValue('user-id');
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, emailVerified: true });
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result.message).toContain('already verified');
    });
  });
});
