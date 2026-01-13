import { apiService } from './api.service';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    data: any;
}

interface NotificationResponse {
    success: boolean;
    notifications: Notification[];
    unreadCount: number;
}

export const notificationService = {
    async getNotifications(limit = 20): Promise<NotificationResponse> {
        const response = await apiService.get<NotificationResponse>(`/api/court-owner/notifications?limit=${limit}`);
        if (response.error || !response.data) {
            throw new Error(response.error || 'Failed to fetch notifications');
        }
        return response.data;
    },

    async markAsRead(notificationIds: string[]): Promise<boolean> {
        const response = await apiService.patch('/api/court-owner/notifications', { notificationIds });
        return !response.error;
    },

    async markAllAsRead(): Promise<boolean> {
        const response = await apiService.patch('/api/court-owner/notifications', { markAll: true });
        return !response.error;
    }
};
