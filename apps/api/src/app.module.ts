import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { KycModule } from './kyc/kyc.module';
import { CommonModule } from './common/common.module';
import appConfig from './config/app.config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ──────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },     // 10 req/sec
      { name: 'medium', ttl: 60000, limit: 100 },  // 100 req/min
    ]),

    // ── Redis cache ────────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [createKeyv(configService.get<string>('REDIS_URL', 'redis://localhost:6379'))],
        ttl: 300, // default 5 minutes
      }),
    }),

    // ── Feature modules ────────────────────────────────────────
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    WalletModule,
    TransactionsModule,
    PaymentsModule,
    NotificationsModule,
    HealthModule,
    AdminModule,
    KycModule,
  ],
})
export class AppModule {}
