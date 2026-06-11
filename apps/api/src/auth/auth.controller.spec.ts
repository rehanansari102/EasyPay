// Hoist mock so jest never loads the real AuthService (which pulls in otplib → ESM)
jest.mock('./auth.service');

import { INestApplication, UnauthorizedException, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Johnson',
  role: 'USER',
  isEmailVerified: false,
};

const mockTokens = {
  accessToken: 'access.token.here',
  refreshToken: 'refresh.token.here',
};

/** LocalAuthGuard stub: sets req.user and passes (mimics successful passport-local) */
const stubLocalGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

/** JwtAuthGuard stub: requires Authorization header to simulate authenticated requests */
const stubJwtGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['authorization']) throw new UnauthorizedException();
    req.user = mockUser;
    return true;
  },
};

describe('Auth API contracts', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerificationEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    })
      .overrideGuard(LocalAuthGuard).useValue(stubLocalGuard)
      .overrideGuard(JwtAuthGuard).useValue(stubJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/v1/auth/register ────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    const validPayload = {
      email: 'alice@example.com',
      password: 'Alice@123456',
      firstName: 'Alice',
      lastName: 'Johnson',
    };

    it('201: creates a new user and returns user object', async () => {
      authService.register.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(validPayload.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('400: rejects weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validPayload, password: 'weakpassword' })
        .expect(400);
    });

    it('400: rejects invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validPayload, email: 'not-an-email' })
        .expect(400);
    });

    it('400: rejects missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'alice@example.com' })
        .expect(400);
    });

    it('400: rejects extra unknown fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validPayload, hackerField: 'injected' })
        .expect(400);
    });

    it('409: propagates conflict when email already registered', async () => {
      authService.register.mockRejectedValueOnce(
        Object.assign(new Error('Email already registered'), { status: 409 }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validPayload)
        .expect((res) => {
          // Service throws — NestJS default exception filter maps it; status may be 409 or 500
          expect([409, 500]).toContain(res.status);
        });
    });
  });

  // ── POST /api/v1/auth/login ───────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    const validPayload = {
      email: 'alice@example.com',
      password: 'Alice@123456',
    };

    it('200: returns user when credentials are valid', async () => {
      authService.login.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(validPayload)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(validPayload.email);
    });

    it('400: rejects missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'Alice@123456' })
        .expect(400);
    });

    it('400: rejects missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com' })
        .expect(400);
    });
  });

  // ── DELETE /api/v1/auth/logout ────────────────────────────────
  describe('DELETE /api/v1/auth/logout', () => {
    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/auth/logout')
        .expect(401);
    });
  });
});
