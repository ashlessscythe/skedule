export type NotificationChannel = 'email' | 'sms';

export type NotificationMessage = {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
};

export interface NotificationService {
  channel: NotificationChannel;
  send(message: NotificationMessage): Promise<{ skipped?: boolean; id?: string | null }>;
}

