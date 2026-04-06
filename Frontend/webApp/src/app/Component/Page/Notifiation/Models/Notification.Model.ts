export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Alert = 'alert',
  TaskStatusChanged = 'taskstatuschanged',
  UserStoryAdded = 'userstoryadded',
  ProjectAdded = 'projectadded',
  UserRoleChanged = 'userrolechanged',
  TaskDeadlineApproaching = 'taskdeadlineapproaching',
  TaskOverdue = 'taskoverdue',
  TicketStatusChanged = 'ticketstatuschanged'
}

export interface Notification {
  id: number;
  userId?: number;
  title: string;
  message: string;
  type: NotificationType | string;
  isRead: boolean;
  createdAt: string | Date;
  category?: string | number;
  relatedTaskId?: number | null;
  relatedUserId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  emailSent?: boolean;
  emailSentAt?: string | null;
  readAt?: string | null;
  link?: string;
}

