import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../Service/NotificationService';
import { TokenService } from '../../../Auth/Service/token.service';
import { Subscription, interval } from 'rxjs';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, NotificationDropdownComponent],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef);

  unreadCount = 0;
  showDropdown = false;
  userId: number | null = null;
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 30000; // 30 seconds

  ngOnInit(): void {
    // Get user ID from token
    const tokenPayload = this.tokenService.getTokenPayload();
    const userIdClaim = tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? tokenPayload?.['sub'];
    const userIdValue = typeof userIdClaim === 'string' ? userIdClaim : null;
    this.userId = userIdValue ? parseInt(userIdValue, 10) : null;

    // Subscribe to unread count
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      this.cdr.markForCheck();
    });

    // Initial load
    if (this.userId) {
      this.notificationService.loadNotifications(this.userId);
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  private startAutoRefresh(): void {
    if (!this.userId) return;

    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (!document.hidden && this.userId) {
        this.notificationService.loadNotifications(this.userId);
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }
}
