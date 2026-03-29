import { useEffect, useState } from 'react';
import {
    fetchLeaderProjects,
    fetchLeaderTeams,
    fetchTeamMembersWithTasks,
    fetchRecentActivity,
    fetchAllLeaderTasksEnriched,
} from '../services/leaderDashboardService';
import { fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from '../services/dashboardService';
import type { Notification } from '../types/notification';
import type { EnrichedTask } from '../types/task';

interface MemberActivity {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    todo: number;
    in_progress: number;
    done: number;
}

interface ProjectWithTasks {
    id: string;
    name: string;
    team_id: string;
    tasks: { id: string; status: string; assigned_to: string | null; due_date: string | null; title: string }[];
}

export function useLeaderDashboard(userId: string) {
    const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [calendarTasks, setCalendarTasks] = useState<EnrichedTask[]>([]);
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

        const [teamsRes, notifsRes, activityRes, calendarRes] = await Promise.all([
            fetchLeaderTeams(userId),
            fetchUserNotifications(userId),
            fetchRecentActivity(userId),
            fetchAllLeaderTasksEnriched(userId),
        ]);

        const fetchedTeams = teamsRes.data ?? [];
        setTeams(fetchedTeams);
        setNotifications(notifsRes.data ?? []);
        setRecentActivity(activityRes.data ?? []);
        setCalendarTasks(calendarRes.data ?? []);

        const projectsRes = await fetchLeaderProjects(userId);
        setProjects((projectsRes.data as ProjectWithTasks[]) ?? []);

        if (fetchedTeams.length > 0) {
            const membersRes = await fetchTeamMembersWithTasks(fetchedTeams[0].id);
            setMemberActivity(membersRes.data);
        }

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

    const allTasks = projects.flatMap(p => p.tasks);
    const totalTasks = allTasks.length;
    const completedCount = allTasks.filter(t => t.status === 'done').length;
    const inProgressCount = allTasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = allTasks.filter(t =>
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    );
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return {
        projects, teams, memberActivity, recentActivity,
        calendarTasks, notifications, unreadCount,
        totalTasks, completedCount, inProgressCount,
        overdueTasks, loading, error,
        readNotification, readAll, reload: loadAll,
    };
}