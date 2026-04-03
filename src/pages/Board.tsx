import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { FolderOpen, User, Clock, AlertCircle } from 'lucide-react';
import type { TaskStatus } from '../types/task';
import styles from '../styles/Board.module.css';

interface TaskWithDetails {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    project_id: string;
    project_name: string;
    assigned_to: string | null;
    assignee_name: string | null;
    due_date: string | null;
    created_at: string;
}

type FilterKey = 'all' | 'assigned_to_me' | 'assigned_to_others';

const STATUS_CONFIG: Record<TaskStatus, { bg: string; border: string; dot: string; label: string; hoverBorder: string }> = {
    todo: {
        bg: '#F5F3FF',
        border: '#9B6DE3',
        dot: '#6C3EB6',
        hoverBorder: '#6C3EB6',
        label: 'To Do',
    },
    in_progress: {
        bg: '#FFFBEB',
        border: '#F59E0B',
        dot: '#D97706',
        hoverBorder: '#D97706',
        label: 'In Progress',
    },
    done: {
        bg: '#F0FDF9',
        border: '#3ED598',
        dot: '#1a7a52',
        hoverBorder: '#1a7a52',
        label: 'Done',
    },
};

export default function Board() {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<FilterKey>('all');

    useEffect(() => {
        async function loadTasks() {
            if (!user) return;

            setIsLoading(true);
            setError(null);

            try {
                const { data: memberRows, error: memberError } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user.id);

                if (memberError || !memberRows?.length) {
                    setTasks([]);
                    setIsLoading(false);
                    return;
                }

                const teamIds = memberRows.map(r => r.team_id);

                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('id, name')
                    .in('team_id', teamIds);

                if (projectsError || !projectsData?.length) {
                    setTasks([]);
                    setIsLoading(false);
                    return;
                }

                const projectIds = projectsData.map((p: any) => p.id);
                const projectMap = new Map(projectsData.map((p: any) => [p.id, p.name]));

                const { data: tasksData, error: tasksError } = await supabase
                    .from('tasks')
                    .select('id, title, description, status, project_id, assigned_to, due_date, created_at')
                    .in('project_id', projectIds);

                if (tasksError) {
                    setError('Unable to load tasks.');
                    setIsLoading(false);
                    return;
                }

                const assigneeIds = [
                    ...new Set((tasksData as any[]).map(t => t.assigned_to).filter(Boolean)),
                ];

                let usersMap = new Map<string, string>();
                if (assigneeIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('users')
                        .select('id, full_name')
                        .in('id', assigneeIds);
                    if (usersData) {
                        usersMap = new Map(usersData.map((u: any) => [u.id, u.full_name || u.id]));
                    }
                }

                const enrichedTasks: TaskWithDetails[] = (tasksData as any[]).map(task => ({
                    ...task,
                    project_name: projectMap.get(task.project_id) || 'Unknown Project',
                    assignee_name: task.assigned_to ? usersMap.get(task.assigned_to) : null,
                }));

                setTasks(enrichedTasks);
            } catch {
                setError('Unexpected error loading tasks.');
            } finally {
                setIsLoading(false);
            }
        }

        loadTasks();
    }, [user]);

    const filteredTasks = useMemo(() => {
        if (filterType === 'assigned_to_me') return tasks.filter(t => t.assigned_to === user?.id);
        if (filterType === 'assigned_to_others') return tasks.filter(t => t.assigned_to && t.assigned_to !== user?.id);
        return tasks;
    }, [tasks, filterType, user?.id]);

    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, TaskWithDetails[]> = { todo: [], in_progress: [], done: [] };
        filteredTasks.forEach(task => { grouped[task.status]?.push(task); });
        return grouped;
    }, [filteredTasks]);

    const progressStats = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'done').length;
        const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, percentage };
    }, [filteredTasks]);

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.loadingText}>Loading board…</div>
            </div>
        );
    }

    const filterOptions: { key: FilterKey; label: string; count: number }[] = [
        { key: 'all', label: 'All tasks', count: tasks.length },
        { key: 'assigned_to_me', label: 'Assigned to me', count: tasks.filter(t => t.assigned_to === user?.id).length },
        { key: 'assigned_to_others', label: 'Assigned to others', count: tasks.filter(t => t.assigned_to && t.assigned_to !== user?.id).length },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>Board</h1>
                <p className={styles.headerSubtitle}>Manage tasks across your projects</p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total tasks</div>
                    <div className={`${styles.statValue} ${styles.statValuePrimary}`}>{progressStats.total}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>In progress</div>
                    <div className={`${styles.statValue} ${styles.statValueAmber}`}>{progressStats.inProgress}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Completed</div>
                    <div className={`${styles.statValue} ${styles.statValueGreen}`}>{progressStats.completed}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Progress</div>
                    <div className={`${styles.statValue} ${styles.statValuePrimary}`}>{progressStats.percentage}%</div>
                </div>
            </div>

            <div className={styles.progressBarWrapper}>
                <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill} style={{ width: `${progressStats.percentage}%` }} />
                </div>
            </div>

            <div className={styles.filterRow}>
                {filterOptions.map(filter => (
                    <button
                        key={filter.key}
                        onClick={() => setFilterType(filter.key)}
                        className={`${styles.filterBtn} ${filterType === filter.key ? styles.filterBtnActive : ''}`}
                    >
                        {filter.label}
                        <span className={styles.filterCount}>({filter.count})</span>
                    </button>
                ))}
            </div>

            <div className={styles.kanbanGrid}>
                {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => {
                    const statusTasks = tasksByStatus[status];
                    const cfg = STATUS_CONFIG[status];

                    return (
                        <div key={status}>
                            <div className={styles.columnHeader} style={{ borderBottom: `2px solid ${cfg.border}` }}>
                                <span className={styles.columnDot} style={{ backgroundColor: cfg.dot }} />
                                <h3 className={styles.columnTitle}>{cfg.label}</h3>
                                <span
                                    className={styles.columnBadge}
                                    style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.dot }}
                                >
                                    {statusTasks.length}
                                </span>
                            </div>

                            <div className={styles.cardList}>
                                {statusTasks.length === 0 ? (
                                    <div className={styles.emptyColumn}>
                                        <div>No tasks yet</div>
                                    </div>
                                ) : (
                                    statusTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => navigate(`/tasks/${task.id}`)}
                                            className={styles.taskCard}
                                            style={{ background: cfg.bg, borderColor: cfg.border }}
                                            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = cfg.hoverBorder; }}
                                            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = cfg.border; }}
                                        >
                                            <div className={styles.taskTitle}>{task.title}</div>

                                            {task.description && (
                                                <div className={styles.taskDescription}>{task.description}</div>
                                            )}

                                            <div className={styles.taskMeta}>
                                                <div className={styles.taskProject}>
                                                    <FolderOpen size={12} />
                                                    {task.project_name}
                                                </div>
                                                <div className={styles.taskMetaRow}>
                                                    {task.assignee_name ? (
                                                        <div className={styles.taskAssignee}>
                                                            <User size={12} />
                                                            {task.assignee_name}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.taskUnassigned}>Unassigned</div>
                                                    )}
                                                    {task.due_date && (
                                                        <div className={isOverdue(task.due_date) ? styles.taskDueDateOverdue : styles.taskDueDate}>
                                                            {isOverdue(task.due_date)
                                                                ? <AlertCircle size={12} />
                                                                : <Clock size={12} />
                                                            }
                                                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}