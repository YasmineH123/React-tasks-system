import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';

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
  todo: '#6c3eb6',
  in_progress: '#0ea5e9',
  review: '#f59e0b',
  done: '#10b981',
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
    return <div style={{ padding: '24px' }}>Loading project...</div>;
  }

  if (errorMsg) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>Project Detail</h2>
        <p style={{ color: '#b91c1c' }}>{errorMsg}</p>
        <Link to="/dashboard">Go back</Link>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ marginBottom: '8px' }}>{project.name}</h1>
        {project.description ? <p>{project.description}</p> : <p>No project description.</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <strong>Progress</strong>
          <span>
            {doneCount}/{totalCount} done ({progress}%)
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '10px',
            borderRadius: '8px',
            background: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#10b981',
            }}
          />
        </div>
      </div>

      {user?.role === 'leader' && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
          <Link to={`/projects/${project.id}/tasks/new`}>New Task</Link>
          <Link to="/team-management">Manage Team</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'start',
          }}
        >
          {(['todo', 'in_progress', 'review', 'done'] as const).map((statusKey) => (
            <div
              key={statusKey}
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '10px',
                minHeight: '260px',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                {statusLabels[statusKey]} ({columns[statusKey].length})
              </h3>

              <div style={{ display: 'grid', gap: '8px' }}>
                {columns[statusKey].length === 0 && (
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>No tasks</div>
                )}

                {columns[statusKey].map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'block',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>{task.title}</div>
                    <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
                      Assignee: {task.assigneeName}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        color: 'white',
                        background: statusColors[task.status],
                        borderRadius: '999px',
                        padding: '3px 8px',
                      }}
                    >
                      {statusLabels[task.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '12px',
            background: '#fff',
            height: 'fit-content',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Team Members ({teamMembers.length})</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {teamMembers.length === 0 && (
              <p style={{ color: '#6b7280' }}>No team members found.</p>
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
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: '#ede9fe',
                      color: '#4c1d95',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {initials || 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{member.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div style={{ marginTop: '18px' }}>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    </div>
  );
}