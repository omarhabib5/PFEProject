import { Component, OnInit, OnDestroy, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../Service/NotificationService';
import { TokenService } from '../../../Auth/Service/token.service';
import { Notification } from '../Models/notification.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @Output() close = new EventEmitter<void>();

  notifications: Notification[] = [];
  userId: number | null = null;
  loading = false;
  private notificationSubscription: Subscription | null = null;

  paginate = 5;
  displayCount = 5;

  get hasUnreadInDisplayed(): boolean {
    return this.getDisplayedNotifications().some(n => !n.isRead);
  }

  ngOnInit(): void {
    // Get user ID from token
    const tokenPayload = this.tokenService.getTokenPayload();
    const userIdClaim = tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? tokenPayload?.['sub'];
    const userIdValue = typeof userIdClaim === 'string' ? userIdClaim : null;
    this.userId = userIdValue ? parseInt(userIdValue, 10) : null;

    // Subscribe to notifications
    this.notificationSubscription = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  onNotificationClick(notification: Notification): void {
    // Mark as read if not already read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          if (this.userId) {
            this.notificationService.loadNotifications(this.userId);
          }
        },
        error: (error) => console.error('Error marking notification as read:', error)
      });
    }

    // Navigate to link if provided
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
      this.close.emit();
    }
  }

  deleteNotification(event: Event, notification: Notification): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        if (this.userId) {
          this.notificationService.loadNotifications(this.userId);
        }
      },
      error: (error) => console.error('Error deleting notification:', error)
    });
  }

  markAllAsRead(): void {
    if (!this.userId) return;
    this.notificationService.markAllAsRead(this.userId).subscribe({
      next: () => {
        if (this.userId) {
          this.notificationService.loadNotifications(this.userId);
        }
      },
      error: (error) => console.error('Error marking all as read:', error)
    });
  }

  getDisplayedNotifications(): Notification[] {
    return this.notifications.slice(0, this.displayCount);
  }

  loadMore(): void {
    this.displayCount += this.paginate;
  }

  hasMore(): boolean {
    return this.displayCount < this.notifications.length;
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationTypeColor(type);
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationTypeIcon(type);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  }
}
