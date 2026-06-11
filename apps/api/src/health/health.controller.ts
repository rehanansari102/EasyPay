import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import Redis from 'ioredis';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Extended health check — DB + Redis + uptime' })
  async check() {
    const start = Date.now();
    const [db, redis] = await Promise.allSettled([
      this.pingDb(),
      this.pingRedis(),
    ]);

    const dbStatus = db.status === 'fulfilled' ? 'ok' : 'error';
    const redisStatus = redis.status === 'fulfilled' ? 'ok' : 'error';
    const allOk = dbStatus === 'ok' && redisStatus === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'EasyPay API',
      latencyMs: Date.now() - start,
      checks: {
        database: {
          status: dbStatus,
          ...(db.status === 'rejected' && { error: String(db.reason) }),
        },
        redis: {
          status: redisStatus,
          ...(redis.status === 'rejected' && { error: String(redis.reason) }),
        },
      },
    };
  }

  private async pingDb(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async pingRedis(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const redis = new Redis(url, { lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 1 });
    try {
      await redis.connect();
      await redis.ping();
    } finally {
      redis.disconnect();
    }
  }
}
