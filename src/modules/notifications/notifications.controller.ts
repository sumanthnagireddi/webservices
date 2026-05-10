import {
  Controller,
  Get,
  MessageEvent,
  ParseIntPipe,
  Query,
  Sse,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'Subscribe to live backend notifications using server-sent events',
  })
  stream(): Observable<MessageEvent> {
    return this.notificationsService.stream();
  }

  @Get()
  @ApiOperation({ summary: 'Get recent backend notifications' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of recent notifications to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recent backend notifications',
  })
  getRecentNotifications(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.notificationsService.getRecentNotifications(limit);
  }
}
