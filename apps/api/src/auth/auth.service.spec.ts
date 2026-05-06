import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';

// ── Minimal mocks ────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
};

const mockUsers = {
  findById: jest.fn(),
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

  // ── register ─────────────────────────────────────────────────
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
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'USER',
        isEmailVerified: false,
        twoFactorEnabled: false,
        kycStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: dto.email }) }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('hashes the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => {
        // Verify the stored hash is NOT the plain password
        const isHashed = await bcrypt.compare(dto.password, data.passwordHash);
        expect(isHashed).toBe(true);
        return { id: 'uid', email: dto.email, firstName: dto.firstName, lastName: dto.lastName, role: 'USER', isEmailVerified: false, twoFactorEnabled: false, kycStatus: 'PENDING', createdAt: new Date(), updatedAt: new Date() };
      });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      await service.register(dto);
    });
  });

  // ── generateAuthResponse (private, tested via register) ──────
  describe('generateAuthResponse', () => {
    it('returns both accessToken and refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uid',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'USER',
        isEmailVerified: false,
        twoFactorEnabled: false,
        kycStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCache.del.mockResolvedValue(undefined);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.register({ email: 'a@b.com', password: 'P@ss1234', firstName: 'A', lastName: 'B' });
      expect(result).toHaveProperty('accessToken', 'signed-token');
      expect(result).toHaveProperty('refreshToken', 'signed-token');
    });
  });
});
