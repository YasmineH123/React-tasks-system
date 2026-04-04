import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowRight, Calendar, Users, FolderOpen } from 'lucide-react';
import { getInitials, PROJECT_COLORS } from '../../hooks/useProjectsPage';
import type { ProjectWithTasks } from '../../hooks/useProjectsPage';
import styles from '../../styles/Projects.module.css';

interface MemberStat {
    id: string;
    full_name: string | null;
    todo: number;
    in_progress: number;
    done: number;
}

interface UpcomingTask {
    id: string;
    title: string;
    due_date: string;
    assignee_name: string | null;
    status: string;
}

interface Props {
    project: ProjectWithTasks | null;
}

export default function InstructorSpotlight({ project }: Props) {
    const navigate = useNavigate();

    const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!project) return;
        loadSpotlight(project);
    }, [project?.id]);

    async function loadSpotlight(p: ProjectWithTasks) {
        setLoading(true);
        setMemberStats([]);
        setUpcomingTasks([]);

        const { data: memberRows } = await supabase
            .from('team_members')
            .select('user_id, users(id, full_name)')
            .eq('team_id', p.team_id);

        const userIds = (memberRows ?? []).map((m: any) => m.user_id);
        const nameMap = new Map((memberRows ?? []).map((m: any) => [m.user_id, m.users?.full_name ?? null]));

        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, status, assigned_to, due_date')
            .eq('project_id', p.id);

        const allTasks = (tasks ?? []) as any[];

        const statsMap: Record<string, MemberStat> = {};
        userIds.forEach(uid => {
            statsMap[uid] = { id: uid, full_name: nameMap.get(uid) ?? null, todo: 0, in_progress: 0, done: 0 };
        });

        allTasks.forEach(t => {
            if (t.assigned_to && statsMap[t.assigned_to]) {
                if (t.status === 'todo') statsMap[t.assigned_to].todo++;
                if (t.status === 'in_progress') statsMap[t.assigned_to].in_progress++;
                if (t.status === 'done') statsMap[t.assigned_to].done++;
            }
        });

        setMemberStats(Object.values(statsMap));

        const now = new Date();
        const upcoming = allTasks
            .filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) >= now)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                title: t.title,
                due_date: t.due_date,
                assignee_name: nameMap.get(t.assigned_to) ?? null,
                status: t.status,
            }));

        setUpcomingTasks(upcoming);
        setLoading(false);
    }

    if (!project) {
        return (
            <div className={styles.rightPanel}>
                <div className={styles.rph}>
                    <span className={styles.sectionTitle}>Project spotlight</span>
                </div>
                <div className={styles.spotlightEmpty}>
                    <FolderOpen size={28} color="var(--color-text-secondary)" />
                    <p>Select a project to see its breakdown</p>
                </div>
            </div>
        );
    }

    const color = PROJECT_COLORS[project.colorIdx % PROJECT_COLORS.length];
    const done = project.tasks.filter(t => t.status === 'done').length;
    const total = project.tasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const initials = getInitials(project.name);

    function daysUntil(dateStr: string) {
        const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        return `${diff}d`;
    }

    function isNearDue(dateStr: string) {
        const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
        return diff <= 3;
    }

    return (
        <div className={styles.rightPanel}>
            <div className={styles.rph}>
                <span className={styles.sectionTitle}>Project spotlight</span>
            </div>

            <div className={styles.taskPanel}>
                <div className={styles.spotlightHeader} style={{ background: color }}>
                    <div className={styles.spotlightHeaderCircle} />
                    <div className={styles.spotlightHeaderCircle2} />
                    <div className={styles.spotlightHeaderContent}>
                        <div className={styles.spotlightInitials}>{initials}</div>
                        <div>
                            <div className={styles.spotlightName}>{project.name}</div>
                            <div className={styles.spotlightTeam}>{project.team_name}</div>
                        </div>
                    </div>
                </div>

                <div className={styles.spotlightBody}>
                    <div className={styles.spotlightProgress}>
                        <div className={styles.spotlightProgressRow}>
                            <span className={styles.spotlightProgressLabel}>{pct}% complete</span>
                            <span className={styles.spotlightProgressCount}>{done}/{total} tasks</span>
                        </div>
                        <div className={styles.spotlightBar}>
                            <div className={styles.spotlightBarFill} style={{ width: `${pct}%`, background: color }} />
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.spotlightLoading}>Loading…</div>
                    ) : (
                        <>
                            <div className={styles.spotlightSection}>
                                <div className={styles.spotlightSectionTitle}>
                                    <Users size={12} />
                                    Member breakdown
                                </div>
                                {memberStats.length === 0 && (
                                    <p className={styles.spotlightNone}>No members yet.</p>
                                )}
                                {memberStats.map(m => {
                                    const total = m.todo + m.in_progress + m.done;
                                    const mPct = total > 0 ? Math.round((m.done / total) * 100) : 0;
                                    return (
                                        <div key={m.id} className={styles.memberRow}>
                                            <div className={styles.memberRowAv} style={{ background: color }}>
                                                {getInitials(m.full_name ?? '?')}
                                            </div>
                                            <div className={styles.memberRowInfo}>
                                                <div className={styles.memberRowName}>
                                                    {m.full_name ?? 'Unknown'}
                                                </div>
                                                <div className={styles.memberRowBar}>
                                                    <div
                                                        className={styles.memberRowFill}
                                                        style={{ width: `${mPct}%`, background: color }}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.memberRowPills}>
                                                {m.done > 0 && (
                                                    <span className={styles.pillDone}>{m.done}</span>
                                                )}
                                                {m.in_progress > 0 && (
                                                    <span className={styles.pillProg}>{m.in_progress}</span>
                                                )}
                                                {m.todo > 0 && (
                                                    <span className={styles.pillTodo}>{m.todo}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={styles.spotlightSection}>
                                <div className={styles.spotlightSectionTitle}>
                                    <Calendar size={12} />
                                    Upcoming deadlines
                                </div>
                                {upcomingTasks.length === 0 && (
                                    <p className={styles.spotlightNone}>No upcoming deadlines.</p>
                                )}
                                {upcomingTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className={styles.deadlineRow}
                                        onClick={() => navigate(`/tasks/${t.id}`)}
                                    >
                                        <div className={styles.deadlineLeft}>
                                            <div className={styles.deadlineTitle}>{t.title}</div>
                                            {t.assignee_name && (
                                                <div className={styles.deadlineAssignee}>{t.assignee_name}</div>
                                            )}
                                        </div>
                                        <span
                                            className={styles.deadlineBadge}
                                            style={{
                                                background: isNearDue(t.due_date) ? 'rgba(229,62,62,.08)' : 'rgba(108,62,182,.06)',
                                                color: isNearDue(t.due_date) ? '#C53030' : 'var(--color-primary)',
                                            }}
                                        >
                                            {daysUntil(t.due_date)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <button
                        className={styles.spotlightViewBtn}
                        onClick={() => navigate(`/projects/${project.id}`)}
                    >
                        View project
                        <ArrowRight size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}