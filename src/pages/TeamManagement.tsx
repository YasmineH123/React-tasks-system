import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import type { AppUser } from '../types/auth';
import styles from '../styles/TeamManagement.module.css';

interface TeamMember extends Pick<AppUser, 'id' | 'full_name' | 'email'> {}

interface ProjectWithTeam {
    id: string;
    name: string;
    team_id: string;
    created_by: string | null;
    description: string | null;
    teamMembers: TeamMember[];
    isExpanded: boolean;
}

interface AllUsers {
    id: string;
    full_name: string | null;
    email: string;
}

export default function TeamManagement() {
    const { user } = useAuthContext();

    const [projects, setProjects] = useState<ProjectWithTeam[]>([]);
    const [allUsers, setAllUsers] = useState<AllUsers[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    useEffect(() => {
        async function loadData() {
            if (!user) return;

            setIsLoading(true);
            setError(null);

            try {
                if (user.role !== 'leader' && user.role !== 'instructor') {
                    setError('You do not have permission to access this page.');
                    setIsLoading(false);
                    return;
                }

                let projects_list;

                if (user.role === 'leader') {
                    const { data: leaderProjects, error: projError } = await supabase
                        .from('projects')
                        .select('id, name, team_id, created_by, description')
                        .eq('created_by', user.id);

                    if (projError) {
                        setError('Failed to load projects.');
                        setIsLoading(false);
                        return;
                    }

                    projects_list = leaderProjects as any[];
                } else {
                    const { data: allProjects, error: projError } = await supabase
                        .from('projects')
                        .select('id, name, team_id, created_by, description');

                    if (projError) {
                        setError('Failed to load projects.');
                        setIsLoading(false);
                        return;
                    }

                    projects_list = allProjects as any[];
                }

                const projectsWithMembers: ProjectWithTeam[] = [];

                for (const project of projects_list || []) {
                    const { data: teamMembers, error: membersError } = await supabase
                        .from('team_members')
                        .select('user_id')
                        .eq('team_id', (project as any).team_id);

                    if (membersError) continue;

                    const memberIds = (teamMembers as any[])?.map(m => m.user_id) || [];
                    const { data: userData } = memberIds.length > 0
                        ? await supabase
                              .from('users')
                              .select('id, full_name, email')
                              .in('id', memberIds)
                        : { data: [] };

                    projectsWithMembers.push({
                        id: (project as any).id,
                        name: (project as any).name,
                        team_id: (project as any).team_id,
                        created_by: (project as any).created_by,
                        description: (project as any).description,
                        teamMembers: (userData as TeamMember[]) || [],
                        isExpanded: false,
                    });
                }

                const { data: users } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .eq('role', 'student');

                setProjects(projectsWithMembers);
                setAllUsers((users as AllUsers[]) || []);
                setIsLoading(false);
            } catch (err) {
                setError('Unexpected error loading data.');
                setIsLoading(false);
            }
        }

        loadData();
    }, [user]);

    async function toggleExpandProject(projectId: string) {
        setProjects(prev =>
            prev.map(p => (p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p))
        );
    }

    async function addMemberToProject(projectId: string, userId: string) {
        if (!userId) {
            setError('Please select a user.');
            return;
        }

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const { data: existing } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', project.team_id)
                .eq('user_id', userId);

            if (existing && existing.length > 0) {
                setError('This user is already a member of this team.');
                return;
            }

            const { error: addError } = await supabase
                .from('team_members')
                .insert({ team_id: project.team_id, user_id: userId });

            if (addError) {
                setError(`Failed to add member: ${addError.message}`);
                return;
            }

            const selectedUser = allUsers.find(u => u.id === userId);
            if (selectedUser) {
                setProjects(prev =>
                    prev.map(p =>
                        p.id === projectId
                            ? { ...p, teamMembers: [...p.teamMembers, selectedUser as TeamMember] }
                            : p
                    )
                );
            }

            setSelectedUserId('');
            setError(null);
        } catch (err) {
            setError('Unexpected error adding member.');
        }
    }

    async function removeMemberFromProject(projectId: string, userId: string) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            const { error: removeError } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', project.team_id)
                .eq('user_id', userId);

            if (removeError) {
                setError(`Failed to remove member: ${removeError.message}`);
                return;
            }

            setProjects(prev =>
                prev.map(p =>
                    p.id === projectId
                        ? { ...p, teamMembers: p.teamMembers.filter(m => m.id !== userId) }
                        : p
                )
            );

            setError(null);
        } catch (err) {
            setError('Unexpected error removing member.');
        }
    }

    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <div>
                    <div className={styles.loadingIcon}>⏳</div>
                    <div className={styles.loadingText}>Loading team management…</div>
                </div>
            </div>
        );
    }

    if (error && error.includes('do not have permission')) {
        return (
            <div className={styles.container}>
                <div className="form-error">{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.headerTitle}>Team Management</h1>
                        <p className={styles.headerSubtitle}>
                            Manage teams and add or remove members from your projects
                        </p>
                    </div>
                    {projects.length > 0 && (
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Total Projects</div>
                            <div className={styles.statsValue}>{projects.length}</div>
                        </div>
                    )}
                </div>
            </div>

            {error && !error.includes('do not have permission') && (
                <div className={styles.errorBanner}>⚠️ {error}</div>
            )}
            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    <p className={styles.emptyTitle}>
                        {user?.role === 'leader' ? 'No projects created yet' : 'No projects found'}
                    </p>
                    <p className={styles.emptySubtitle}>
                        {user?.role === 'leader'
                            ? 'Create a project to start managing teams'
                            : 'Instructors can manage all projects'}
                    </p>
                </div>
            ) : (
                <div className={styles.projectList}>
                    {projects.map(project => (
                        <div key={project.id} className={styles.projectCard}>
                            <button
                                onClick={() => toggleExpandProject(project.id)}
                                className={styles.projectHeaderBtn}
                            >
                                <div className={styles.projectHeaderLeft}>
                                    <div className={styles.projectHeaderIcon}>📁</div>
                                    <div>
                                        <div className={styles.projectName}>{project.name}</div>
                                        <div className={styles.projectMeta}>
                                            {project.teamMembers.length} member{project.teamMembers.length !== 1 ? 's' : ''} •{' '}
                                            {user?.role === 'leader' && project.created_by === user.id
                                                ? 'Your project'
                                                : 'Shared project'}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`${styles.projectChevron} ${
                                        project.isExpanded ? styles.projectChevronExpanded : ''
                                    }`}
                                >
                                    ▼
                                </div>
                            </button>

                            {project.isExpanded && (
                                <div className={styles.projectBody}>
                                    {project.description && (
                                        <div className={styles.projectDescription}>
                                            📝 {project.description}
                                        </div>
                                    )}

                                    <div>
                                        <div className={styles.sectionLabel}>
                                            Team Members ({project.teamMembers.length})
                                        </div>

                                        {project.teamMembers.length === 0 ? (
                                            <div className={styles.noMembers}>👥 No team members yet</div>
                                        ) : (
                                            <div className={styles.membersGrid}>
                                                {project.teamMembers.map(member => {
                                                    const initials = (member.full_name || member.email)
                                                        .split(' ')
                                                        .map(n => n[0])
                                                        .join('')
                                                        .toUpperCase()
                                                        .slice(0, 2);

                                                    return (
                                                        <div key={member.id} className={styles.memberCard}>
                                                            <div className={styles.memberInfo}>
                                                                <div className={styles.memberAvatar}>
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div className={styles.memberName}>
                                                                        {member.full_name || member.email}
                                                                    </div>
                                                                    <div className={styles.memberEmail}>
                                                                        {member.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    removeMemberFromProject(project.id, member.id)
                                                                }
                                                                className={`btn btn-sm ${styles.removeBtn}`}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.addMemberSection}>
                                        <div className={styles.sectionLabel}>➕ Add Member</div>
                                        <div className={styles.addMemberRow}>
                                            <select
                                                value={selectedUserId}
                                                onChange={e => setSelectedUserId(e.target.value)}
                                                className={`form-input ${styles.addMemberSelect}`}
                                            >
                                                <option value="">Select a student to add</option>
                                                {allUsers.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.full_name || u.email}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => addMemberToProject(project.id, selectedUserId)}
                                                className={`btn btn-primary ${styles.addMemberBtn}`}
                                            >
                                                Add Member
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
