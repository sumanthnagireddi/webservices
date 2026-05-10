import {
  Controller,
  Get,
  MessageEvent,
  ParseIntPipe,
  Query,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.notificationsService.stream();
  }

  @Get()
  getRecentNotifications(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.notificationsService.getRecentNotifications(limit);
  }
}
