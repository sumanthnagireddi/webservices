export type NotificationStatus = 'success' | 'info' | 'error';

export interface NotificationPayload {
  service: string;
  event: string;
  message: string;
  status?: NotificationStatus;
  entityId?: string;
  data?: Record<string, unknown>;
}

export interface NotificationEnvelope extends NotificationPayload {
  id: string;
  createdAt: string;
  status: NotificationStatus;
}
