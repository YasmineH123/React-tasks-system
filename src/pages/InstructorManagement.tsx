import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import styles from '../styles/InstructorManagement.module.css';
import type { Task } from '../types/task';
import type { AppUser } from '../types/auth';
import type { AccountRequest } from '../types/accountRequest';
import { fetchAllAccountRequests, approveAccountRequest, rejectAccountRequest, createUserDirectly } from '../services/accountRequestService';

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  createdBy: string | null;
  teamMembers: AppUser[];
  totalTasks: number;
  completedTasks: number;
  inReviewTasks: number;
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
    alert(`Account created and email sent to ${newUserForm.email}`);
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
        // Fetch account requests
        const { data: requestsData, error: requestsError } = await fetchAllAccountRequests();
        if (requestsError) throw requestsError;
        setAccountRequests(requestsData || []);

        // Fetch total member count
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .in('role', ['student', 'leader']);
        
        if (usersCount !== null) {
          setTotalMembersCount(usersCount);
        }

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id,name,description,team_id,created_by');

        if (projectsError) throw projectsError;

        if (!projectsData || projectsData.length === 0) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const projectResults: ProjectSummary[] = [];
        for (const p of projectsData) {
          const projectId = p.id as string;
          const teamId = p.team_id as string;

          const tasksResult = await supabase
            .from('tasks')
            .select('id,status')
            .eq('project_id', projectId);
          const tasksData = tasksResult.data as Task[] | null;

          const teamMembersResult = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);
          const teamMembersData = teamMembersResult.data as { user_id: string }[] | null;

          const userIds = teamMembersData?.map(tm => tm.user_id) ?? [];
          const trimmedUsers: AppUser[] = [];
          if (userIds.length > 0) {
            const usersResult = await supabase
              .from('users')
              .select('id,full_name,email,role')
              .in('id', userIds);
            const userRecords = usersResult.data as AppUser[] | null;
            if (userRecords) {
              trimmedUsers.push(...userRecords);
            }
          }

          const totalTasks = tasksData?.length ?? 0;
          const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 } as Record<string, number>;
          tasksData?.forEach(task => {
            const status = task.status ?? 'todo';
            byStatus[status] = (byStatus[status] ?? 0) + 1;
          });

          projectResults.push({
            id: projectId,
            name: p.name as string,
            description: p.description as string | null,
            teamId,
            createdBy: p.created_by as string | null,
            teamMembers: trimmedUsers,
            totalTasks,
            completedTasks: byStatus.done || 0,
            inReviewTasks: byStatus.review || 0,
            inProgressTasks: byStatus.in_progress || 0,
            todoTasks: byStatus.todo || 0,
          });
        }

        setProjects(projectResults);
      } catch (err) {
        console.error(err);
        setError('Failed to load instructor data.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!loading) {
      loadData();
    }
  }, [loading, user]);

  const pendingRequests = accountRequests.filter(r => r.status === 'pending');

  async function handleApproveRequest(request: AccountRequest) {
    setApprovalAction(request.id);
    try {
      console.log('Starting approval process for request:', request.id);

      // First, update the request status
      const { error: statusError } = await approveAccountRequest(request.id);
      if (statusError) {
        console.error('Error updating request status:', statusError);
        throw new Error(`Failed to update request status: ${statusError.message}`);
      }

      console.log('Request status updated successfully');

      // For now, just update the status and inform the instructor
      // Account creation will be handled separately or manually
      setAccountRequests(prev =>
        prev.map(r => (r.id === request.id ? { ...r, status: 'approved' } : r))
      );

      alert(`Request approved! The user can now be manually added to the system.`);

    } catch (err) {
      console.error('Error approving request:', err);
      alert(`Failed to approve request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovalAction(null);
    }
  }

  async function handleRejectRequest(requestId: string) {
    setApprovalAction(requestId);
    try {
      const { error } = await rejectAccountRequest(requestId);
      if (error) {
        console.error('Error updating request status:', error);
        throw new Error('Failed to update request status');
      }

      setAccountRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );

      alert('Request rejected successfully');
    } catch (err) {
      console.error('Error rejecting request:', err);
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
        <div>
          <div className={styles.loadingIcon}>⏳</div>
          <div className={styles.loadingText}>Loading instructor overview…</div>
        </div>
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
          <h1 className={styles.headerTitle}>Instructor Management</h1>
          <p className={styles.headerSubtitle}>Manage account requests, view projects, teams, and task progress.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #E56ACF, #6C3EB6)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + Add member
        </button>
      </div>

      {/* Account Requests Section */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 32, padding: 16, backgroundColor: '#FFF8E6', borderRadius: 8, borderLeft: '4px solid #F59E0B' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
            Pending Account Requests ({pendingRequests.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingRequests.map(request => (
              <div
                key={request.id}
                style={{
                  padding: 12,
                  backgroundColor: 'white',
                  borderRadius: 6,
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{request.full_name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{request.email}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    Role: <strong>{request.role === 'leader' ? 'Team Leader' : 'Student'}</strong>
                  </div>
                  {request.message && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                      Message: {request.message}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleApproveRequest(request)}
                    disabled={approvalAction === request.id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: approvalAction === request.id ? 'not-allowed' : 'pointer',
                      opacity: approvalAction === request.id ? 0.7 : 1,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {approvalAction === request.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={approvalAction === request.id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: approvalAction === request.id ? 'not-allowed' : 'pointer',
                      opacity: approvalAction === request.id ? 0.7 : 1,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
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
          <div className={styles.statsLabel}>Assigned Members</div>
          <div className={styles.statsValue}>{overallStats.memberCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Total Members</div>
          <div className={styles.statsValue}>{totalMembersCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Total Tasks</div>
          <div className={styles.statsValue}>{overallStats.taskCount}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsLabel}>Done Rate</div>
          <div className={styles.statsValue}>{overallStats.taskDonePercent}%</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👩‍🏫</div>
          <div className={styles.emptyTitle}>No projects available yet</div>
          <div className={styles.emptySubtitle}>Ask project leaders to create projects to begin tracking.</div>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Projects</h2>
          <div className={styles.projectList}>
            {projects.map(project => {
              const progress = project.totalTasks === 0 ? 0 : Math.round((project.completedTasks / project.totalTasks) * 100);
              return (
                <div key={project.id} className={styles.projectCard}>
                  <div className={styles.projectHeader}>
                    <h3 className={styles.projectName}>{project.name}</h3>
                    <span className={styles.projectMeta}>Team {project.teamId}</span>
                  </div>
                  <p className={styles.projectDescription}>{project.description || 'No description yet.'}</p>
                  <div className={styles.projectProgressRow}>
                    <div className={styles.projectProgressBar}>
                      <div className={styles.projectProgressFill} style={{ width: `${progress}%` }} />
                    </div>
                    <div className={styles.progressText}>{progress}% done</div>
                  </div>
                  <div className={styles.statusGrid}>
                    <span>Todo: {project.todoTasks}</span>
                    <span>In Progress: {project.inProgressTasks}</span>
                    <span>Review: {project.inReviewTasks}</span>
                    <span>Done: {project.completedTasks}</span>
                  </div>
                  <div className={styles.teamMembers}>Team members ({project.teamMembers.length}):</div>
                  <div className={styles.memberList}>
                    {project.teamMembers.map(member => (
                      <div key={member.id} className={styles.memberChip}>
                        {member.full_name || member.email}
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
            width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(108,62,182,0.2)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>
              Add new member
            </h2>

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
                  <option value="leader">Team Leader</option>
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
                style={{
                  flex: 2, padding: '10px',
                  background: 'linear-gradient(135deg, #E56ACF, #6C3EB6)',
                  border: 'none', borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', color: '#fff',
                  opacity: createLoading ? 0.7 : 1,
                }}
              >
                {createLoading ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
