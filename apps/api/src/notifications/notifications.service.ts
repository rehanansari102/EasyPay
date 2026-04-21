import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';
import { NotificationType } from '@prisma/client';
import { REDIS_KEYS } from '@finvault/shared';

interface SendNotificationDto {
  title: string;
  message: string;
  type: 'TRANSACTION' | 'SECURITY' | 'PROMOTION' | 'SYSTEM';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // ── Create & publish ──────────────────────────────────────────
  async send(userId: string, dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: dto.title,
        message: dto.message,
        type: dto.type as NotificationType,
        metadata: dto.metadata,
      },
    });

    // Publish to Redis channel for real-time (SSE/WebSocket consumers)
    await this.cache.set(
      `${REDIS_KEYS.NOTIFICATION_CHANNEL(userId)}:${notification.id}`,
      JSON.stringify(notification),
      30_000, // 30-second window for pickup
    );

    return notification;
  }

  // ── List ──────────────────────────────────────────────────────
  async list(userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Mark read ─────────────────────────────────────────────────
  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
