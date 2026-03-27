import { supabase } from '../lib/supabaseClient';
import type { Task } from '../types/task';
import type { Notification } from '../types/notification';

export async function fetchStudentTasks(userId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true });

    return { data: data as Task[] | null, error };
}

export async function fetchStudentProjects(userId: string) {
    const { data: memberRows, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);

    if (memberError || !memberRows?.length) return { data: [], error: memberError };

    const teamIds = memberRows.map(r => r.team_id);

    const { data, error } = await supabase
        .from('projects')
        .select(`*, tasks (id, status)`)
        .in('team_id', teamIds);

    return { data, error };
}

export async function fetchUserNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    return { data: data as Notification[] | null, error };
}

export async function markNotificationRead(id: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    return { error };
}

export async function markAllNotificationsRead(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    return { error };
}