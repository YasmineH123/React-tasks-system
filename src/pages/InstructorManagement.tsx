import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { UserPlus, X } from 'lucide-react';
import styles from '../styles/InstructorManagement.module.css';
import type { Task } from '../types/task';
import type { AppUser } from '../types/auth';
import type { AccountRequest } from '../types/accountRequest';
import {
  fetchAllAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  createUserDirectly,
} from '../services/accountRequestService';

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  teamName: string;
  createdBy: string | null;
  teamMembers: AppUser[];
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
}

export default function InstructorManagement() {
  const { user, loading } = useAuthContext();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<string | null>(null);
  const [totalMembersCount, setTotalMembersCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ full_name: '', email: '', role: 'student' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateUser() {
    if (!newUserForm.full_name || !newUserForm.email) return;
    setCreateLoading(true);
    setCreateError(null);

    const { error } = await createUserDirectly(
      newUserForm.email,
      newUserForm.full_name,
      newUserForm.role
    );

    if (error) {
      setCreateError(error.message);
      setCreateLoading(false);
      return;
    }

    setShowAddModal(false);
    setNewUserForm({ full_name: '', email: '', role: 'student' });
    setCreateLoading(false);
    alert(`Account created and invite email sent to ${newUserForm.email}`);
  }

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      if (user.role !== 'instructor') {
        setError('You do not have permission to access this page.');
        setIsLoading(false);
        return;
      }

      try {
        const { data: requestsData, error: requestsError } = await fetchAllAccountRequests();
        if (requestsError) throw requestsError;
        setAccountRequests(requestsData ?? []);

        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        if (usersCount !== null) setTotalMembersCount(usersCount);

        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, description, team_id, created_by, teams(name)');

        if (projectsError) throw projectsError;
        if (!projectsData?.length) { setProjects([]); setIsLoading(false); return; }

        const projectResults: ProjectSummary[] = [];

        for (const p of projectsData) {
          const projectId = p.id as string;
          const teamId = p.team_id as string;
          const teamName = (p as any).teams?.name ?? teamId;

          const { data: tasksData } = await supabase
            .from('tasks')
            .select('id, status')
            .eq('project_id', projectId);

          const { data: memberRows } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);

          const userIds = (memberRows ?? []).map((m: any) => m.user_id);
          let trimmedUsers: AppUser[] = [];

          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, full_name, email, role, avatar_url, created_at')
              .in('id', userIds);
            trimmedUsers = (usersData as AppUser[]) ?? [];
          }

          const byStatus: Record<string, number> = { todo: 0, in_progress: 0, done: 0 };
          (tasksData as Task[] ?? []).forEach(task => {
            const s = task.status ?? 'todo'; byStatus[s] = (byStatus[s] ?? 0) + 1;
          });

          projectResults.push({
            id: projectId,
            name: p.name as string,
            description: p.description as string | null,
            teamId,
            teamName,
            createdBy: p.created_by as string | null,
            teamMembers: trimmedUsers,
            totalTasks: (tasksData ?? []).length,
            completedTasks: byStatus.done,
            inProgressTasks: byStatus.in_progress,
            todoTasks: byStatus.todo,
          });
        }

        setProjects(projectResults);
      } catch {
        setError('Failed to load instructor data.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!loading) loadData();
  }, [loading, user]);

  const pendingRequests = accountRequests.filter(r => r.status === 'pending');

  async function handleApproveRequest(request: AccountRequest) {
    setApprovalAction(request.id);
    try {
      const { error: statusError } = await approveAccountRequest(request.id);
      if (statusError) throw new Error(statusError.message);
      setAccountRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r)
      );
    } catch (err) {
      alert(`Failed to approve request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovalAction(null);
    }
  }

  async function handleRejectRequest(requestId: string) {
    setApprovalAction(requestId);
    try {
      const { error } = await rejectAccountRequest(requestId);
      if (error) throw new Error(error.message);
      setAccountRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r)
      );
    } catch (err) {
      alert(`Failed to reject request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovalAction(null);
    }
  }

  const overallStats = useMemo(() => {
    const projectCount = projects.length;
    const teamCount = new Set(projects.map(p => p.teamId)).size;
    const memberSet = new Set(projects.flatMap(p => p.teamMembers.map(m => m.id)));
    const taskCount = projects.reduce((sum, p) => sum + p.totalTasks, 0);
    const doneCount = projects.reduce((sum, p) => sum + p.completedTasks, 0);
    return {
      projectCount,
      teamCount,
      memberCount: memberSet.size,
      taskCount,
      taskDonePercent: taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100),
    };
  }, [projects]);

  if (isLoading || loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loadingText}>Loading instructor overview…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Instructor management</h1>
          <p className={styles.headerSubtitle}>
            Manage account requests, projects, teams, and task progress.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <UserPlus size={15} />
          Add member
        </button>
      </div>

      {pendingRequests.length > 0 && (
        <div className={styles.requestsSection}>
          <h2 className={styles.sectionTitle}>
            Pending requests ({pendingRequests.length})
          </h2>
          <div className={styles.requestList}>
            {pendingRequests.map(request => (
              <div key={request.id} className={styles.requestCard}>
                <div>
                  <div className={styles.requestName}>{request.full_name}</div>
                  <div className={styles.requestEmail}>{request.email}</div>
                  {request.message && (
                    <div className={styles.requestMessage}>{request.message}</div>
                  )}
                </div>
                <div className={styles.requestActions}>
                  <button
                    onClick={() => handleApproveRequest(request)}
                    disabled={approvalAction === request.id}
                    className={styles.btnApprove}
                  >
                    {approvalAction === request.id ? 'Processing…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={approvalAction === request.id}
                    className={styles.btnReject}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Projects</div>
          <div className={styles.statsValue}>{overallStats.projectCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Teams</div>
          <div className={styles.statsValue}>{overallStats.teamCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Assigned members</div>
          <div className={styles.statsValue}>{overallStats.memberCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Total students</div>
          <div className={styles.statsValue}>{totalMembersCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Total tasks</div>
          <div className={styles.statsValue}>{overallStats.taskCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Done rate</div>
          <div className={styles.statsValue}>{overallStats.taskDonePercent}%</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No projects available yet</div>
          <div className={styles.emptySubtitle}>Create projects to begin tracking.</div>
        </div>
      ) : (
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>Projects</h2>
          <div className={styles.projectList}>
            {projects.map(project => {
              const progress = project.totalTasks === 0
                ? 0
                : Math.round((project.completedTasks / project.totalTasks) * 100);
              return (
                <div key={project.id} className={styles.projectCard}>
                  <div className={styles.projectHeader}>
                    <h3 className={styles.projectName}>{project.name}</h3>
                    <span className={styles.projectMeta}>{project.teamName}</span>
                  </div>
                  <p className={styles.projectDescription}>
                    {project.description ?? 'No description yet.'}
                  </p>
                  <div className={styles.projectProgressRow}>
                    <div className={styles.projectProgressBar}>
                      <div
                        className={styles.projectProgressFill}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className={styles.progressText}>{progress}% done</div>
                  </div>
                  <div className={styles.statusGrid}>
                    <span>Todo: {project.todoTasks}</span>
                    <span>In progress: {project.inProgressTasks}</span>
                    <span>Done: {project.completedTasks}</span>
                  </div>
                  <div className={styles.teamMembers}>
                    Team members ({project.teamMembers.length})
                  </div>
                  <div className={styles.memberList}>
                    {project.teamMembers.map(member => (
                      <div key={member.id} className={styles.memberChip}>
                        {member.full_name ?? member.email}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            width: '100%', maxWidth: 420,
            boxShadow: '0 8px 32px rgba(108,62,182,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>
                Add new member
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setCreateError(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Full name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Full name"
                  value={newUserForm.full_name}
                  onChange={e => setNewUserForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="email@university.edu"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={newUserForm.role}
                  onChange={e => setNewUserForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="student">Student</option>
                </select>
              </div>
              {createError && <p className="form-error">{createError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => { setShowAddModal(false); setCreateError(null); }}
                style={{
                  flex: 1, padding: '10px', background: '#F5F5F7',
                  border: 'none', borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', color: '#6E6E73',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={createLoading || !newUserForm.full_name || !newUserForm.email}
                className="btn btn-primary"
                style={{ flex: 2, opacity: createLoading ? 0.7 : 1 }}
              >
                {createLoading ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}