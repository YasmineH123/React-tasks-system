import { supabase } from '../lib/supabaseClient';

export async function fetchLeaderTeams(userId: string) {
    const { data, error } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name)')
        .eq('user_id', userId)
        .eq('team_role', 'leader');

    if (error || !data) return { data: [], error };

    const teams = data.map((m: any) => ({
        id: m.teams?.id ?? m.team_id,
        name: m.teams?.name ?? null,
    }));

    return { data: teams, error: null };
}

export async function fetchLeaderProjects(userId: string) {
    const { data: teams } = await fetchLeaderTeams(userId);
    if (!teams?.length) return { data: [], error: null };

    const teamIds = teams.map(t => t.id);
    const { data, error } = await supabase
        .from('projects')
        .select('*, tasks(id, status, assigned_to, due_date, title)')
        .in('team_id', teamIds);

    return { data, error };
}

export async function fetchTeamMembersWithTasks(teamId: string) {
    const { data: members, error } = await supabase
        .from('team_members')
        .select('user_id, users(id, full_name, avatar_url)')
        .eq('team_id', teamId);

    if (error || !members) return { data: [], error };

    const userIds = members.map((m: any) => m.user_id);

    const { data: tasks } = await supabase
        .from('tasks')
        .select('assigned_to, status')
        .in('assigned_to', userIds);

    const result = members.map((m: any) => ({
        id: m.user_id,
        full_name: m.users?.full_name ?? null,
        avatar_url: m.users?.avatar_url ?? null,
        todo: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'todo').length,
        in_progress: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'in_progress').length,
        done: (tasks ?? []).filter((t: any) => t.assigned_to === m.user_id && t.status === 'done').length,
    }));

    return { data: result, error: null };
}

export async function fetchRecentActivity(userId: string) {
    const { data: teams } = await fetchLeaderTeams(userId);
    if (!teams?.length) return { data: [], error: null };

    const teamIds = teams.map(t => t.id);

    const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .in('team_id', teamIds);

    if (!projects?.length) return { data: [], error: null };

    const projectIds = projects.map(p => p.id);

    const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to, due_date, created_at, users!assigned_to(full_name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(5);

    return { data, error };
}

export async function fetchAllLeaderTasksEnriched(userId: string) {
    const { data: teams } = await fetchLeaderTeams(userId);
    if (!teams?.length) return { data: [], error: null };

    const teamIds = teams.map(t => t.id);

    const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('team_id', teamIds);

    if (!projects?.length) return { data: [], error: null };

    const projectIds = projects.map(p => p.id);
    const projectMap: Record<string, string> = {};
    projects.forEach(p => { projectMap[p.id] = p.name; });

    const { data, error } = await supabase
        .from('tasks')
        .select('*, users!assigned_to(full_name)')
        .in('project_id', projectIds)
        .not('due_date', 'is', null);

    if (error || !data) return { data: [], error };

    const enriched = data.map((t: any) => ({
        ...t,
        assignee_name: t.users?.full_name ?? null,
        project_name: projectMap[t.project_id] ?? null,
    }));

    return { data: enriched, error: null };
}