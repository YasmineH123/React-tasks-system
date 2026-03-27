import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import styles from '../styles/ProjectDetail.module.css';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
};

type TaskRow = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assigned_to: string | null;
};

type UserLite = {
  id: string;
  full_name: string | null;
  email: string;
};

type TaskCard = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assigneeName: string;
};

type TeamMemberCard = {
  id: string;
  full_name: string | null;
  email: string;
};

const statusLabels: Record<TaskCard['status'], string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const statusColors: Record<TaskCard['status'], string> = {
  todo: styles.todo,
  in_progress: styles.inProgress,
  review: styles.review,
  done: styles.done,
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberCard[]>([]);

  useEffect(() => {
    if (!id) {
      setErrorMsg('Project id is missing from URL.');
      setLoading(false);
      return;
    }

    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function loadPage() {
      setLoading(true);
      setErrorMsg('');

      // 1) Fetch project by id
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, team_id')
        .eq('id', id)
        .single();

      if (projectError || !projectData) {
        if (!cancelled) {
          setErrorMsg('Project not found. It may have been deleted or the link is invalid.');
          setLoading(false);
        }
        return;
      }

      // 2) Access check: user must be a team member of project team
      const { data: memberRow, error: memberError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', projectData.team_id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (memberError) {
        if (!cancelled) {
          setErrorMsg('Unable to verify project access right now. Please try again.');
          setLoading(false);
        }
        return;
      }

      if (!memberRow) {
        // Requirement: no-access users are redirected
        navigate('/dashboard', { replace: true });
        return;
      }

      // 3) Fetch tasks in this project
      const { data: taskRows, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to')
        .eq('project_id', id);

      if (tasksError) {
        if (!cancelled) {
          setErrorMsg('Failed to load project tasks.');
          setLoading(false);
        }
        return;
      }

      const safeTaskRows = (taskRows ?? []) as TaskRow[];

      // 4) Resolve assignee names
      const assigneeIds = Array.from(
        new Set(safeTaskRows.map((t) => t.assigned_to).filter(Boolean))
      ) as string[];

      let assigneeNameById = new Map<string, string>();

      if (assigneeIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', assigneeIds);

        if (usersError) {
          if (!cancelled) {
            setErrorMsg('Failed to load assignee names.');
            setLoading(false);
          }
          return;
        }

        const users = (usersData ?? []) as UserLite[];
        assigneeNameById = new Map(
          users.map((u) => [u.id, u.full_name ?? u.email])
        );
      }

      const taskCards: TaskCard[] = safeTaskRows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeName: t.assigned_to
          ? assigneeNameById.get(t.assigned_to) ?? 'Unknown user'
          : 'Unassigned',
      }));

      // 5) Fetch team members
      const { data: teamMemberRows, error: teamMembersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', projectData.team_id);

      if (teamMembersError) {
        if (!cancelled) {
          setErrorMsg('Failed to load team members.');
          setLoading(false);
        }
        return;
      }

      const memberIds = Array.from(
        new Set((teamMemberRows ?? []).map((r) => r.user_id))
      ) as string[];

      let memberCards: TeamMemberCard[] = [];

      if (memberIds.length > 0) {
        const { data: memberUsersData, error: memberUsersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', memberIds);

        if (memberUsersError) {
          if (!cancelled) {
            setErrorMsg('Failed to load member profile details.');
            setLoading(false);
          }
          return;
        }

        memberCards = ((memberUsersData ?? []) as UserLite[]).map((u) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
        }));
      }

      if (!cancelled) {
        setProject(projectData as ProjectRow);
        setTasks(taskCards);
        setTeamMembers(memberCards);
        setLoading(false);
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user, navigate]);

  const columns = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      review: tasks.filter((t) => t.status === 'review'),
      done: tasks.filter((t) => t.status === 'done'),
    }),
    [tasks]
  );

  const doneCount = columns.done.length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  if (loading || authLoading) {
    return <div className={styles.loading}>Loading project...</div>;
  }

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
        {project.description ? (
          <p className={styles.subtitle}>{project.description}</p>
        ) : (
          <p className={styles.subtitle}>No project description.</p>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.progressTop}>
          <strong className={styles.sectionTitle}>Progress</strong>
          <span className={styles.progressText}>
            {doneCount}/{totalCount} done ({progress}%)
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {user?.role === 'leader' && (
        <div className={styles.actionRow}>
          <Link to={`/projects/${project.id}/tasks/new`} className="btn btn-primary">New Task</Link>
          <Link to="/team-management" className="btn btn-secondary">Manage Team</Link>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.board}>
          {(['todo', 'in_progress', 'review', 'done'] as const).map((statusKey) => (
            <div key={statusKey} className={styles.column}>
              <h3 className={styles.columnTitle}>
                {statusLabels[statusKey]} ({columns[statusKey].length})
              </h3>

              <div className={styles.cardList}>
                {columns[statusKey].length === 0 && (
                  <div className={styles.emptyState}>No tasks</div>
                )}

                {columns[statusKey].map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className={styles.taskCard}
                  >
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.assignee}>
                      Assignee: {task.assigneeName}
                    </div>
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
          <h3 className={styles.sectionTitle}>Team Members ({teamMembers.length})</h3>
          <div className={styles.memberList}>
            {teamMembers.length === 0 && (
              <p className={styles.emptyState}>No team members found.</p>
            )}

            {teamMembers.map((member) => {
              const name = member.full_name ?? member.email;
              const initials = name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={member.id} className={styles.memberItem}>
                  <div className={styles.memberAvatar}>
                    {initials || 'U'}
                  </div>
                  <div>
                    <div className={styles.memberName}>{name}</div>
                    <div className={styles.memberEmail}>{member.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className={styles.footerNav}>
        <Link to="/dashboard" className="link">Back to Dashboard</Link>
      </div>
    </div>
  );
}