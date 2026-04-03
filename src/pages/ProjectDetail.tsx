import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import styles from '../styles/ProjectDetail.module.css';

type TaskStatus = 'todo' | 'in_progress' | 'done';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
};

type TaskCard = {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeName: string;
};

type TeamMemberCard = {
  id: string;
  full_name: string | null;
  email: string;
  team_role: string;
};

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};

const statusColors: Record<TaskStatus, string> = {
  todo: styles.todo,
  in_progress: styles.inProgress,
  done: styles.done,
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLeaderOf, loading: authLoading } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberCard[]>([]);

  useEffect(() => {
    if (!id || authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setErrorMsg('');

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, team_id')
        .eq('id', id)
        .single();

      if (projectError || !projectData) {
        if (!cancelled) { setErrorMsg('Project not found.'); setLoading(false); }
        return;
      }

      const { data: memberRow } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', projectData.team_id)
        .eq('user_id', user!.id)
        .maybeSingle();

      const isInstructor = user!.role === 'instructor';
      if (!memberRow && !isInstructor) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to')
        .eq('project_id', id);

      const safeTaskRows = (taskRows ?? []) as any[];

      const assigneeIds = [...new Set(safeTaskRows.map(t => t.assigned_to).filter(Boolean))] as string[];
      const assigneeMap = new Map<string, string>();

      if (assigneeIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', assigneeIds);
        (usersData ?? []).forEach((u: any) => assigneeMap.set(u.id, u.full_name ?? u.email));
      }

      const taskCards: TaskCard[] = safeTaskRows.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeName: t.assigned_to ? assigneeMap.get(t.assigned_to) ?? 'Unknown' : 'Unassigned',
      }));

      const { data: memberRows } = await supabase
        .from('team_members')
        .select('user_id, team_role, users(id, full_name, email)')
        .eq('team_id', projectData.team_id);

      const memberCards: TeamMemberCard[] = (memberRows ?? []).map((m: any) => ({
        id: m.user_id,
        full_name: m.users?.full_name ?? null,
        email: m.users?.email ?? '',
        team_role: m.team_role,
      }));

      if (!cancelled) {
        setProject(projectData as ProjectRow);
        setTasks(taskCards);
        setTeamMembers(memberCards);
        setLoading(false);
      }
    }

    void loadPage();
    return () => { cancelled = true; };
  }, [id, authLoading, user, navigate]);

  const columns = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  }), [tasks]);

  const doneCount = columns.done.length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const canManage = project ? isLeaderOf(project.team_id) : false;

  if (loading || authLoading) return <div className={styles.loading}>Loading project...</div>;

  if (errorMsg) {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Project Detail</h2>
        <p className="form-error">{errorMsg}</p>
        <Link to="/dashboard" className="link">Go back</Link>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className={styles.page}>
      <div className={styles.headerWrap}>
        <h1 className={styles.pageTitle}>{project.name}</h1>
        <p className={styles.subtitle}>{project.description ?? 'No project description.'}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.progressTop}>
          <strong className={styles.sectionTitle}>Progress</strong>
          <span className={styles.progressText}>{doneCount}/{totalCount} done ({progress}%)</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {canManage && (
        <div className={styles.actionRow}>
          <Link
            to={`/tasks/new?project=${project.id}&name=${encodeURIComponent(project.name)}`}
            className="btn btn-primary"
          >
            New task
          </Link>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.board}>
          {(['todo', 'in_progress', 'done'] as const).map(statusKey => (
            <div key={statusKey} className={styles.column}>
              <h3 className={styles.columnTitle}>
                {statusLabels[statusKey]} ({columns[statusKey].length})
              </h3>
              <div className={styles.cardList}>
                {columns[statusKey].length === 0 && (
                  <div className={styles.emptyState}>No tasks</div>
                )}
                {columns[statusKey].map(task => (
                  <Link key={task.id} to={`/tasks/${task.id}`} className={styles.taskCard}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.assignee}>{task.assigneeName}</div>
                    <span className={`${styles.badge} ${statusColors[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className={styles.memberAside}>
          <h3 className={styles.sectionTitle}>Team members ({teamMembers.length})</h3>
          <div className={styles.memberList}>
            {teamMembers.map(member => {
              const name = member.full_name ?? member.email;
              const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={member.id} className={styles.memberItem}>
                  <div className={styles.memberAvatar}>{initials || 'U'}</div>
                  <div>
                    <div className={styles.memberName}>{name}</div>
                    <div className={styles.memberEmail}>
                      {member.team_role === 'leader' ? 'Leader' : 'Member'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className={styles.footerNav}>
        <Link to="/projects" className="link">Back to projects</Link>
      </div>
    </div>
  );
}