export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Alert = 'alert'
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType | string;
  isRead: boolean;
  createdAt: Date;
  link?: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType | string;
  link?: string;
  userId: number;
}
