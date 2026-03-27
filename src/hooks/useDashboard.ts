import { useEffect, useState } from 'react';
import { fetchStudentTasks, fetchStudentProjects, fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from '../services/dashboardService';
import type { Task } from '../types/task';
import type { Notification } from '../types/notification';

interface ProjectWithProgress {
    id: string;
    name: string;
    team_id: string;
    created_at: string;
    description: string | null;
    created_by: string | null;
    tasks: { id: string; status: string }[];
}

export function useStudentDashboard(userId: string) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        loadAll();
    }, [userId]);

    async function loadAll() {
        setLoading(true);
        setError(null);

        const [tasksRes, projectsRes, notifsRes] = await Promise.all([
            fetchStudentTasks(userId),
            fetchStudentProjects(userId),
            fetchUserNotifications(userId),
        ]);

        if (tasksRes.error) setError('Failed to load tasks.');
        if (projectsRes.error) setError('Failed to load projects.');

        setTasks(tasksRes.data ?? []);
        setProjects((projectsRes.data as ProjectWithProgress[]) ?? []);
        setNotifications(notifsRes.data ?? []);
        setLoading(false);
    }

    async function readNotification(id: string) {
        await markNotificationRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    }

    async function readAll() {
        await markAllNotificationsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return {
        tasks, projects, notifications, unreadCount,
        loading, error,
        readNotification, readAll, reload: loadAll,
    };
}