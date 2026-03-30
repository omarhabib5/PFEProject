import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable, BehaviorSubject, interval } from "rxjs";
import { environment } from "../../../environment";
import { Notification, CreateNotificationDto, NotificationType } from "../Models/Notification.Model";

@Injectable({
    providedIn: "root",
})
export class NotificationService {
    private apiUrl = `${environment.apiUrl}/Notification`;
    private http = inject(HttpClient);
    
    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();

    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    constructor() {
        this.initAutoRefresh();
    }

 
    getUserNotifications(userId: number): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`);
    }

    /**
     * Get unread notifications for a user
     */
    getUnreadNotifications(userId: number): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}/unread`);
    }

    /**
     * Mark a notification as read
     */
    markAsRead(notificationId: number): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${notificationId}/mark-as-read`, {});
    }

    /**
     * Delete a notification
     */
    deleteNotification(notificationId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
    }

    /**
     * Get current unread count from behavior subject
     */
    getUnreadCount(): number {
        return this.unreadCountSubject.value;
    }

    /**
     * Update notifications and unread count
     */
    loadNotifications(userId: number): void {
        this.getUserNotifications(userId).subscribe({
            next: (notifications) => {
                this.notificationsSubject.next(notifications);
                const unreadCount = notifications.filter(n => !n.isRead).length;
                this.unreadCountSubject.next(unreadCount);
            },
            error: (error) => {
                console.error('Error loading notifications:', error);
            }
        });
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: number): Observable<void> {
        return new Observable((observer) => {
            const notifications = this.notificationsSubject.value;
            const unreadNotifications = notifications.filter(n => !n.isRead);
            
            if (unreadNotifications.length === 0) {
                observer.next();
                observer.complete();
                return;
            }

            let completed = 0;
            unreadNotifications.forEach(notification => {
                this.markAsRead(notification.id).subscribe({
                    next: () => {
                        completed++;
                        if (completed === unreadNotifications.length) {
                            this.loadNotifications(userId);
                            observer.next();
                            observer.complete();
                        }
                    },
                    error: (error) => {
                        observer.error(error);
                    }
                });
            });
        });
    }

    /**
     * Initialize auto-refresh of notifications (30 seconds interval)
     */
    private initAutoRefresh(): void {
        interval(30000).subscribe(() => {
            // Auto-refresh will be triggered by component
        });
    }

    /**
     * Get notification type color for UI
     */
    getNotificationTypeColor(type: NotificationType | string): string {
        switch (type?.toString().toLowerCase()) {
            case 'success':
                return '#4ade80'; // Green
            case 'warning':
                return '#facc15'; // Yellow
            case 'alert':
                return '#ef4444'; // Red
            case 'info':
            default:
                return '#60a5fa'; // Blue
        }
    }

    /**
     * Get notification type icon
     */
    getNotificationTypeIcon(type: NotificationType | string): string {
        switch (type?.toString().toLowerCase()) {
            case 'success':
                return '✓';
            case 'warning':
                return '⚠';
            case 'alert':
                return '✕';
            case 'info':
            default:
                return 'ⓘ';
        }
    }
}