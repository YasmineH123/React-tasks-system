import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Project } from '../types/project';

export interface ProjectWithTasks extends Project {
    tasks: { id: string; status: string; due_date: string | null }[];
    team_name: string | null;
    members: { id: string; full_name: string | null }[];
    colorIdx: number;
}

export interface MyTask {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    project_name: string;
}

export type ViewMode = 'cards' | 'list' | 'detailed';
export type SortMode = 'name' | 'progress' | 'deadline';
export type TaskFilter = 'all' | 'overdue' | 'upcoming' | 'next7' | 'next30';

export type TaskTag = 'overdue' | 'due-soon' | 'in-progress' | 'todo';

export function getTaskTag(task: MyTask): TaskTag {
    const now = new Date();
    if (!task.due_date) return task.status === 'in_progress' ? 'in-progress' : 'todo';
    const due = new Date(task.due_date);
    if (due < now && task.status !== 'done') return 'overdue';
    const diff = (due.getTime() - now.getTime()) / 86400000;
    if (diff <= 7 && task.status !== 'done') return 'due-soon';
    if (task.status === 'in_progress') return 'in-progress';
    return 'todo';
}

export const PROJECT_COLORS = [
    'linear-gradient(135deg,#E56ACF,#6C3EB6)',
    'linear-gradient(135deg,#3B6FD4,#4F46E5)',
    'linear-gradient(135deg,#10B981,#3ED598)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
    'linear-gradient(135deg,#8B5CF6,#EC4899)',
];

export const TAG_CONFIG: Record<TaskTag, { bg: string; color: string; label: string; border: string }> = {
    overdue: { bg: 'rgba(229,62,62,.08)', color: '#C53030', label: 'Overdue', border: '#E53E3E' },
    'due-soon': { bg: 'rgba(108,62,182,.08)', color: '#4A2A8A', label: 'Due soon', border: '#9B6DE3' },
    'in-progress': { bg: 'rgba(62,213,152,.1)', color: '#1a7a52', label: 'In progress', border: '#3ED598' },
    todo: { bg: 'rgba(108,62,182,.06)', color: '#6C3EB6', label: 'Todo', border: '#D1D1D6' },
};

export const GROUP_ORDER: TaskTag[] = ['overdue', 'due-soon', 'in-progress', 'todo'];
export const GROUP_LABELS: Record<TaskTag, string> = {
    overdue: 'Overdue',
    'due-soon': 'Due soon',
    'in-progress': 'In progress',
    todo: 'Todo',
};

export function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function useProjectsPage() {
    const { user } = useAuthContext();

    const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
    const [myTasks, setMyTasks] = useState<MyTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [sortMode, setSortMode] = useState<SortMode>('name');
    const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');

    useEffect(() => {
        async function loadData() {
            if (!user) return;

            const { data: memberRows } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id);

            const teamIds = (memberRows ?? []).map((r: any) => r.team_id);

            let projectQuery = supabase
                .from('projects')
                .select('*, teams(name), tasks(id, status, due_date)');

            if (user.role !== 'instructor') {
                if (!teamIds.length) { setProjects([]); setIsLoading(false); return; }
                projectQuery = projectQuery.in('team_id', teamIds);
            }

            const { data: projectsData } = await projectQuery;
            const rawProjects = (projectsData ?? []) as any[];

            const enriched: ProjectWithTasks[] = await Promise.all(
                rawProjects.map(async (p, idx) => {
                    const { data: memberData } = await supabase
                        .from('team_members')
                        .select('user_id, users(id, full_name)')
                        .eq('team_id', p.team_id);

                    return {
                        ...p,
                        tasks: p.tasks ?? [],
                        team_name: p.teams?.name ?? null,
                        members: (memberData ?? []).map((m: any) => ({
                            id: m.user_id,
                            full_name: m.users?.full_name ?? null,
                        })),
                        colorIdx: idx,
                    };
                })
            );

            setProjects(enriched);

            const allProjectIds = enriched.map(p => p.id);
            const projectNameMap = Object.fromEntries(enriched.map(p => [p.id, p.name]));

            if (allProjectIds.length > 0) {
                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select('id, title, status, due_date, project_id')
                    .eq('assigned_to', user.id)
                    .neq('status', 'done')
                    .in('project_id', allProjectIds);

                setMyTasks(
                    (tasksData ?? []).map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        due_date: t.due_date,
                        project_name: projectNameMap[t.project_id] ?? 'Unknown',
                    }))
                );
            }

            setIsLoading(false);
        }

        loadData();
    }, [user]);

    const filteredProjects = useMemo(() => {
        let list = projects.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
        if (sortMode === 'name') {
            list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortMode === 'progress') {
            list = [...list].sort((a, b) => {
                const pA = a.tasks.length ? a.tasks.filter(t => t.status === 'done').length / a.tasks.length : 0;
                const pB = b.tasks.length ? b.tasks.filter(t => t.status === 'done').length / b.tasks.length : 0;
                return pB - pA;
            });
        } else if (sortMode === 'deadline') {
            list = [...list].sort((a, b) => {
                const dA = a.tasks.map(t => t.due_date).filter(Boolean).sort()[0] ?? '9999';
                const dB = b.tasks.map(t => t.due_date).filter(Boolean).sort()[0] ?? '9999';
                return dA.localeCompare(dB);
            });
        }
        return list;
    }, [projects, search, sortMode]);

    const filteredTasks = useMemo(() => {
        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 86400000);
        const in30 = new Date(now.getTime() + 30 * 86400000);

        return myTasks.filter(t => {
            if (taskFilter === 'all') return true;
            if (!t.due_date) return taskFilter === 'upcoming';
            const due = new Date(t.due_date);
            if (taskFilter === 'overdue') return due < now;
            if (taskFilter === 'upcoming') return due >= now;
            if (taskFilter === 'next7') return due >= now && due <= in7;
            if (taskFilter === 'next30') return due >= now && due <= in30;
            return true;
        }).sort((a, b) =>
            GROUP_ORDER.indexOf(getTaskTag(a)) - GROUP_ORDER.indexOf(getTaskTag(b))
        );
    }, [myTasks, taskFilter]);

    const groupedTasks = useMemo(() => {
        const groups: Record<TaskTag, MyTask[]> = {
            overdue: [], 'due-soon': [], 'in-progress': [], todo: [],
        };
        filteredTasks.forEach(t => { groups[getTaskTag(t)].push(t); });
        return groups;
    }, [filteredTasks]);
    
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    const selectedProject = useMemo(
        () => projects.find(p => p.id === selectedProjectId) ?? null,
        [projects, selectedProjectId]
    );
    return {
        user, isLoading,
        filteredProjects, myTasks,
        filteredTasks, groupedTasks,
        search, setSearch,
        viewMode, setViewMode,
        sortMode, setSortMode,
        taskFilter, setTaskFilter,
        selectedProjectId, setSelectedProjectId,
        selectedProject,
    };
}