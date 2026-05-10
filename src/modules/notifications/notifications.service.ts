import { randomUUID } from 'crypto';
import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge } from 'rxjs';
import {
  NotificationEnvelope,
  NotificationPayload,
  NotificationStatus,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly notificationSubject = new Subject<NotificationEnvelope>();
  private readonly recentNotifications: NotificationEnvelope[] = [];
  private readonly maxRecentNotifications = 100;

  publish(payload: NotificationPayload): NotificationEnvelope {
    const notification: NotificationEnvelope = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: payload.status ?? 'info',
      ...payload,
    };

    this.storeRecentNotification(notification);
    this.notificationSubject.next(notification);
    return notification;
  }

  publishSuccess(payload: Omit<NotificationPayload, 'status'>) {
    return this.publish({
      ...payload,
      status: 'success',
    });
  }

  publishInfo(payload: Omit<NotificationPayload, 'status'>) {
    return this.publish({
      ...payload,
      status: 'info',
    });
  }

  publishError(payload: Omit<NotificationPayload, 'status'>) {
    return this.publish({
      ...payload,
      status: 'error',
    });
  }

  stream(): Observable<MessageEvent> {
    return merge(
      this.notificationSubject.pipe(
        map((notification) => ({
          type: notification.event,
          data: notification,
        })),
      ),
      interval(30000).pipe(
        map(() => ({
          type: 'notifications.heartbeat',
          data: {
            service: 'notifications',
            event: 'notifications.heartbeat',
            message: 'Notifications stream heartbeat',
            status: 'info' as NotificationStatus,
            createdAt: new Date().toISOString(),
          },
        })),
      ),
    );
  }

  getRecentNotifications(limit = 20): NotificationEnvelope[] {
    return this.recentNotifications.slice(0, this.normalizeLimit(limit));
  }

  private storeRecentNotification(notification: NotificationEnvelope) {
    this.recentNotifications.unshift(notification);

    if (this.recentNotifications.length > this.maxRecentNotifications) {
      this.recentNotifications.length = this.maxRecentNotifications;
    }
  }

  private normalizeLimit(limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) {
      return 20;
    }

    return Math.min(Math.floor(limit), this.maxRecentNotifications);
  }
}
