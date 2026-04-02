import { useEffect, useState } from 'react';
import {
    fetchAllProjects,
    fetchAllTeams,
    fetchAllStudents,
    fetchAllMemberActivity,
    fetchPendingRequests,
} from '../services/instructorDashboardService';
import {
    fetchUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../services/dashboardService';
import type { Notification } from '../types/notification';

interface ProjectWithTasks {
    id: string;
    name: string;
    team_id: string;
    tasks: { id: string; status: string }[];
}

export function useInstructorDashboard(userId: string) {
    const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [memberActivity, setMemberActivity] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
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

        const [projectsRes, teamsRes, studentsRes, membersRes, requestsRes, notifsRes] =
            await Promise.all([
                fetchAllProjects(),
                fetchAllTeams(),
                fetchAllStudents(),
                fetchAllMemberActivity(),
                fetchPendingRequests(),
                fetchUserNotifications(userId),
            ]);

        setProjects((projectsRes.data as ProjectWithTasks[]) ?? []);
        setTeams(teamsRes.data ?? []);
        setStudents(studentsRes.data ?? []);
        setMemberActivity(membersRes.data ?? []);
        setPendingRequests(requestsRes.data ?? []);
        setNotifications(notifsRes.data ?? []);
        setLoading(false);
    }

    async function readNotification(id: string) {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }

    async function readAll() {
        await markAllNotificationsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    function removeRequest(id: string) {
        setPendingRequests(prev => prev.filter(r => r.id !== id));
    }

    const allTasks = projects.flatMap(p => p.tasks);
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter(t => t.status === 'done').length;
    const inProgTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = allTasks.filter(t => t.status === 'todo').length;
    const avgCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return {
        projects, teams, students, memberActivity, pendingRequests,
        notifications, unreadCount,
        totalTasks, doneTasks, inProgTasks, todoTasks, avgCompletion,
        loading, error,
        readNotification, readAll, removeRequest, reload: loadAll,
    };
}