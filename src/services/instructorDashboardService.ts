import { supabase } from '../lib/supabaseClient';

export async function fetchAllProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('*, tasks(id, status)');
    return { data, error };
}

export async function fetchAllTeams() {
    const { data, error } = await supabase
        .from('teams')
        .select('id, name, created_by');
    return { data, error };
}

export async function fetchAllStudents() {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, avatar_url')
        .eq('role', 'student');
    return { data, error };
}

export async function fetchAllMemberActivity() {
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, team_id, users(id, full_name, avatar_url), teams(name)');

    if (membersError || !members) return { data: [], error: membersError };

    const userIds = [...new Set(members.map((m: any) => m.user_id))];

    const { data: tasks } = await supabase
        .from('tasks')
        .select('assigned_to, status')
        .in('assigned_to', userIds);

    const result = members.map((m: any) => ({
        id: m.user_id,
        full_name: m.users?.full_name ?? null,
        avatar_url: m.users?.avatar_url ?? null,
        team_name: m.teams?.name ?? null,
        todo: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'todo').length,
        in_progress: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'in_progress').length,
        done: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'done').length,
    }));

    return { data: result, error: null };
}

export async function fetchPendingRequests() {
    const { data, error } = await supabase
        .from('account_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    return { data, error };
}