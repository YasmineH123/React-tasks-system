import { useEffect, useState } from 'react';
import { fetchUserNotifications } from '../services/dashboardService';
import type { Notification } from '../types/notification';

export function useNotifications(userId: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!userId) return;
        fetchUserNotifications(userId).then(({ data }) => {
            setNotifications(data ?? []);
        });
    }, [userId]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return { notifications, unreadCount };
}