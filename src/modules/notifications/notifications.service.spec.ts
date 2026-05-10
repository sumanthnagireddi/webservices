import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish success notifications', () => {
    const notification = service.publishSuccess({
      service: 'test',
      event: 'test.success',
      message: 'It worked',
    });

    expect(notification.status).toBe('success');
    expect(service.getRecentNotifications(1)).toHaveLength(1);
  });
});
