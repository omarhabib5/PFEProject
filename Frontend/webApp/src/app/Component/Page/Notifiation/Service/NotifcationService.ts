import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable, BehaviorSubject, interval, forkJoin, of } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { environment } from "../../../environment";
import { Notification, CreateNotificationDto, NotificationType } from "../Models/Notification.Model";

export interface DirectMessageDto {
    recipientUserId: number;
    message: string;
    taskId?: number | null;
    title?: string;
    attachmentName?: string;
    attachmentDataUrl?: string;
}

@Injectable({
    providedIn: "root",
})
export class NotificationService {
    private apiUrl = `${environment.apiUrl}/notification`;
    private http = inject(HttpClient);
    
    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();

    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    constructor() {
        this.initAutoRefresh();
    }

 
    getUserNotifications(userId: number): Observable<Notification[]> {
        // Prefer the implemented API route first to avoid noisy 404s in dev console.
        return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).pipe(
            catchError(() => this.http.get<Notification[]>(`${this.apiUrl}`)),
            map((items) => this.normalizeNotifications(items))
        );
    }

    /**
     * Get unread notifications for a user
     */
    getUnreadNotifications(userId: number): Observable<Notification[]> {
        // Prefer the implemented API route first to avoid noisy 404s in dev console.
        return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}/unread`).pipe(
            catchError(() => this.http.get<Notification[]>(`${this.apiUrl}?onlyUnread=true`)),
            map((items) => this.normalizeNotifications(items))
        );
    }

    /**
     * Mark a notification as read
     */
    markAsRead(notificationId: number): Observable<void> {
        // Prefer the implemented API route first to avoid noisy 405s in dev console.
        return this.http.patch<void>(`${this.apiUrl}/${notificationId}/mark-as-read`, {}).pipe(
            catchError(() => this.http.put<void>(`${this.apiUrl}/${notificationId}/mark-as-read`, {}))
        );
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
        const unreadNotifications = this.notificationsSubject.value.filter((n) => !n.isRead);

        if (unreadNotifications.length === 0) {
            return of(void 0);
        }

        return forkJoin(unreadNotifications.map((n) => this.markAsRead(n.id))).pipe(
            switchMap(() => this.getUserNotifications(userId)),
            map((notifications) => {
                this.notificationsSubject.next(notifications);
                this.unreadCountSubject.next(notifications.filter((n) => !n.isRead).length);
                return void 0;
            })
        );
    }

    sendDirectMessage(payload: DirectMessageDto): Observable<Notification> {
        return this.http.post<Notification>(`${this.apiUrl}/direct-message`, payload).pipe(
            map((item) => {
                const normalized = this.normalizeNotifications([item]);
                return normalized[0] ?? item;
            })
        );
    }

    getConversation(otherUserId: number): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/conversation/${otherUserId}`).pipe(
            map((items) => this.normalizeNotifications(items))
        );
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
        switch (this.normalizeType(type)) {
            case 'success':
                return '#4ade80'; // Green
            case 'warning':
                return '#facc15'; // Yellow
            case 'alert':
            case 'taskoverdue':
                return '#ef4444'; // Red
            case 'taskdeadlineapproaching':
                return '#f97316'; // Orange
            case 'info':
            case 'taskstatuschanged':
            case 'ticketstatuschanged':
            case 'userstoryadded':
            case 'projectadded':
            case 'userrolechanged':
            default:
                return '#60a5fa'; // Blue
        }
    }

    /**
     * Get notification type icon
     */
    getNotificationTypeIcon(type: NotificationType | string): string {
        switch (this.normalizeType(type)) {
            case 'success':
                return '✓';
            case 'warning':
                return '⚠';
            case 'alert':
            case 'taskoverdue':
                return '✕';
            case 'taskdeadlineapproaching':
                return '⏰';
            case 'taskstatuschanged':
            case 'ticketstatuschanged':
                return '↻';
            case 'projectadded':
                return '📁';
            case 'userstoryadded':
                return '📝';
            case 'userrolechanged':
                return '👤';
            case 'info':
            default:
                return 'ⓘ';
        }
    }

    private normalizeNotifications(items: Notification[] | null | undefined): Notification[] {
        if (!items || items.length === 0) {
            return [];
        }

        return items
            .map((item) => ({
                ...item,
                type: this.normalizeType(item.type),
                createdAt: item.createdAt ?? new Date().toISOString()
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    private normalizeType(type: NotificationType | string | number | null | undefined): string {
        if (type === null || type === undefined) {
            return 'info';
        }

        if (typeof type === 'number') {
            switch (type) {
                case 0:
                    return 'info';
                case 1:
                    return 'success';
                case 2:
                    return 'warning';
                case 3:
                    return 'alert';
                case 4:
                    return 'taskstatuschanged';
                case 5:
                    return 'userstoryadded';
                case 6:
                    return 'projectadded';
                case 7:
                    return 'userrolechanged';
                case 8:
                    return 'taskdeadlineapproaching';
                case 9:
                    return 'taskoverdue';
                case 10:
                    return 'ticketstatuschanged';
                default:
                    return 'info';
            }
        }

        return String(type).trim().toLowerCase();
    }
}