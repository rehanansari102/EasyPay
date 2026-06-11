// Hoist mock so jest never loads the real service and its transitive deps
jest.mock('./transactions.service');

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

/** Stub guard that injects a fake authenticated user into every request */
const mockJwtGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user-1', email: 'alice@example.com', role: 'USER' };
    return true;
  },
};

const mockTransactionDto = {
  id: 'tx-1',
  type: 'TRANSFER',
  status: 'COMPLETED',
  amount: '100',
  fee: '0.50',
  currency: 'USD',
  reference: 'REF-001',
  createdAt: new Date().toISOString(),
};

describe('Transactions API contracts', () => {
  let app: INestApplication;
  let txService: jest.Mocked<TransactionsService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: {
            transfer: jest.fn(),
            getHistory: jest.fn(),
            getById: jest.fn(),
            exportCsv: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    txService = module.get(TransactionsService) as jest.Mocked<TransactionsService>;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/v1/transactions/transfer ────────────────────────
  describe('POST /api/v1/transactions/transfer', () => {
    const validPayload = {
      toAccountNumber: '2222222222',
      amount: 100,
      description: 'Test transfer',
    };

    it('201: returns transaction on successful transfer', async () => {
      txService.transfer.mockResolvedValueOnce(mockTransactionDto as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('type', 'TRANSFER');
      expect(res.body).toHaveProperty('status', 'COMPLETED');
      expect(txService.transfer).toHaveBeenCalledWith('user-1', expect.objectContaining(validPayload));
    });

    it('400: rejects amount below minimum', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send({ ...validPayload, amount: 0.001 })
        .expect(400);
    });

    it('400: rejects amount above maximum', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send({ ...validPayload, amount: 999999 })
        .expect(400);
    });

    it('400: rejects missing toAccountNumber', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send({ amount: 50 })
        .expect(400);
    });

    it('400: propagates insufficient balance from service', async () => {
      txService.transfer.mockRejectedValueOnce(
        new BadRequestException('Insufficient balance'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send(validPayload)
        .expect(400);

      expect(res.body.message).toContain('Insufficient balance');
    });

    it('400: propagates card spending limit exceeded from service', async () => {
      txService.transfer.mockRejectedValueOnce(
        new BadRequestException('Card spending limit of $200.00/day exceeded'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions/transfer')
        .send({ ...validPayload, cardId: '00000000-0000-4000-8000-000000000001' })
        .expect(400);

      expect(res.body.message).toContain('spending limit');
    });
  });

  // ── GET /api/v1/transactions ──────────────────────────────────
  describe('GET /api/v1/transactions', () => {
    it('200: returns paginated history', async () => {
      const mockHistory = {
        data: [mockTransactionDto],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      txService.getHistory.mockResolvedValueOnce(mockHistory as any);

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
    });

    it('200: accepts optional filter query params', async () => {
      txService.getHistory.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);

      await request(app.getHttpServer())
        .get('/api/v1/transactions?type=TRANSFER&status=COMPLETED&page=1&limit=10')
        .expect(200);

      expect(txService.getHistory).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ type: 'TRANSFER', status: 'COMPLETED' }),
      );
    });
  });

  // ── GET /api/v1/transactions/:id ──────────────────────────────
  describe('GET /api/v1/transactions/:id', () => {
    it('200: returns transaction by ID', async () => {
      txService.getById.mockResolvedValueOnce(mockTransactionDto as any);

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions/tx-1')
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('404: propagates not-found from service', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      txService.getById.mockRejectedValueOnce(new NotFoundException('Transaction not found'));

      await request(app.getHttpServer())
        .get('/api/v1/transactions/nonexistent-id')
        .expect(404);
    });
  });
});
