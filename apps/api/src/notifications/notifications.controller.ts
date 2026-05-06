import { Controller, Get, OnModuleDestroy, Param, Patch, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable, fromEvent, merge } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Server-Sent Events stream for real-time notifications' })
  stream(@CurrentUser('id') userId: string, @Req() req: any): Observable<MessageEvent> {
    const subject = this.notificationsService.getSubject(userId);
    // Clean up subject when the client disconnects
    req.on('close', () => this.notificationsService.removeSubject(userId));
    return subject.asObservable();
  }

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  list(
    @CurrentUser('id') userId: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    return this.notificationsService.list(userId, onlyUnread === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
