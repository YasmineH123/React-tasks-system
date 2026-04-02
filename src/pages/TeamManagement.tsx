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
    const [selectedUsersForProject, setSelectedUsersForProject] = useState<Record<string, string[]>>({});
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
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
            console.log('🔍 Checking if user already exists in team:', { projectId, userId, teamId: project.team_id });
            
            const { data: existing, error: checkError } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', project.team_id)
                .eq('user_id', userId);

            if (checkError) {
                console.error('❌ Error checking existing members:', checkError);
                setError(`Error checking members: ${checkError.message}`);
                return;
            }

            if (existing && existing.length > 0) {
                console.warn('⚠️ User already a member');
                setError('This user is already a member of this team.');
                return;
            }

            console.log('➕ Attempting to add member to team_members table');
            const { data: insertData, error: addError } = await supabase
                .from('team_members')
                .insert({ team_id: project.team_id, user_id: userId })
                .select();

            if (addError) {
                console.error('❌ Failed to add member:', addError);
                setError(`Failed to add member: ${addError.message}`);
                return;
            }

            console.log('✅ Member added successfully to database:', insertData);

            const selectedUser = allUsers.find(u => u.id === userId);
            if (selectedUser) {
                console.log('🔄 Updating local state with new member:', selectedUser);
                setProjects(prev =>
                    prev.map(p =>
                        p.id === projectId
                            ? { ...p, teamMembers: [...p.teamMembers, selectedUser as TeamMember] }
                            : p
                    )
                );
            }

            setError(null);
            console.log('✨ Member added successfully!');
        } catch (err) {
            console.error('❌ Unexpected error adding member:', err);
            setError(`Unexpected error adding member: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Total Projects</div>
                            <div className={styles.statsValue}>{projects.length}</div>
                        </div>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Total Members</div>
                            <div className={styles.statsValue}>{allUsers.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {error && !error.includes('do not have permission') && (
                <div className={styles.errorBanner}>⚠️ {error}</div>
            )}
            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    <p className={styles.emptyTitle}>
                        No projects found
                    </p>
                    <p className={styles.emptySubtitle}>
                        Instructors need to create projects before teams can be managed.
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

                                    <div className={styles.addMemberSection} style={{ padding: 16 }}>
                                        <div style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1C1C1E' }}>
                                            Select Team Members ({(selectedUsersForProject[project.id] || []).length} selected)
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQueries[project.id] || ''}
                                            onChange={e => setSearchQueries(prev => ({ ...prev, [project.id]: e.target.value }))}
                                            placeholder="Search by name or email"
                                            className="form-input"
                                            style={{ marginBottom: 8, width: '100%', padding: '8px 10px', fontSize: 13 }}
                                        />
                                        
                                        <div style={{
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: 4,
                                            padding: '8px',
                                            marginBottom: '16px',
                                            backgroundColor: '#fff'
                                        }}>
                                            {(() => {
                                                const search = (searchQueries[project.id] || '').trim().toLowerCase();
                                                const filtered = allUsers
                                                    .filter(u => !project.teamMembers.some(m => m.id === u.id))
                                                    .filter(u => {
                                                        if (!search) return true;
                                                        const name = u.full_name?.toLowerCase() || '';
                                                        const email = u.email.toLowerCase();
                                                        return name.includes(search) || email.includes(search);
                                                    });

                                                if (filtered.length === 0) {
                                                    return <div style={{ padding: '12px', color: '#666', fontSize: 13 }}>No matching members found.</div>;
                                                }

                                                return filtered.map(student => {
                                                    const isSelected = (selectedUsersForProject[project.id] || []).includes(student.id);
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                padding: '8px',
                                                                cursor: 'pointer',
                                                                borderRadius: 4,
                                                                backgroundColor: isSelected ? '#E0D4F7' : 'transparent',
                                                            }}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setSelectedUsersForProject(prev => {
                                                                    const selected = prev[project.id] || [];
                                                                    return {
                                                                        ...prev,
                                                                        [project.id]: isSelected 
                                                                            ? selected.filter(id => id !== student.id)
                                                                            : [...selected, student.id]
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                style={{ marginRight: 8, cursor: 'pointer' }}
                                                            />
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>
                                                                    {student.full_name || 'Unknown'}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#666' }}>
                                                                    {student.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        <button
                                            onClick={async () => {
                                                const userIds = selectedUsersForProject[project.id] || [];
                                                if (userIds.length === 0) return;
                                                
                                                for (const uid of userIds) {
                                                    await addMemberToProject(project.id, uid);
                                                }
                                                
                                                setSelectedUsersForProject(prev => ({ ...prev, [project.id]: [] }));
                                                setSearchQueries(prev => ({ ...prev, [project.id]: '' }));
                                            }}
                                            disabled={!(selectedUsersForProject[project.id]?.length > 0)}
                                            className={`btn btn-primary ${styles.addMemberBtn}`}
                                            style={{ width: '100%', fontSize: 13, padding: '10px' }}
                                        >
                                            Add {(selectedUsersForProject[project.id] || []).length} Member{(selectedUsersForProject[project.id] || []).length !== 1 ? 's' : ''}
                                        </button>
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
