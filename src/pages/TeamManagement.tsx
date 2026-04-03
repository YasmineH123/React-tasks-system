import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { Users, FolderOpen, ChevronDown, X, AlertCircle } from 'lucide-react';
import type { AppUser } from '../types/auth';
import styles from '../styles/TeamManagement.module.css';

interface TeamMember extends Pick<AppUser, 'id' | 'full_name' | 'email'> {
    team_role: string;
}

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
    const { user, isLeaderOfAny } = useAuthContext();

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
            let projectsList: any[] = [];

            if (user.role === 'instructor') {
                const { data, error: projError } = await supabase
                    .from('projects')
                    .select('id, name, team_id, created_by, description');
                if (projError) throw projError;
                projectsList = data ?? [];
            } else if (isLeaderOfAny) {
                const { data: memberRows } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user.id)
                    .eq('team_role', 'leader');

                const teamIds = (memberRows ?? []).map((m: any) => m.team_id);

                if (teamIds.length > 0) {
                    const { data, error: projError } = await supabase
                        .from('projects')
                        .select('id, name, team_id, created_by, description')
                        .in('team_id', teamIds);
                    if (projError) throw projError;
                    projectsList = data ?? [];
                }
            } else {
                setError('You do not have permission to access this page.');
                setIsLoading(false);
                return;
            }

            const projectsWithMembers: ProjectWithTeam[] = [];

            for (const project of projectsList) {
                const { data: teamMemberRows } = await supabase
                    .from('team_members')
                    .select('user_id, team_role')
                    .eq('team_id', project.team_id);

                const memberIds = (teamMemberRows ?? []).map((m: any) => m.user_id);
                const roleMap = new Map((teamMemberRows ?? []).map((m: any) => [m.user_id, m.team_role]));

                const { data: userData } = memberIds.length > 0
                    ? await supabase.from('users').select('id, full_name, email').in('id', memberIds)
                    : { data: [] };

                projectsWithMembers.push({
                    id: project.id,
                    name: project.name,
                    team_id: project.team_id,
                    created_by: project.created_by,
                    description: project.description,
                    teamMembers: ((userData ?? []) as any[]).map(u => ({
                        ...u,
                        team_role: roleMap.get(u.id) ?? 'member',
                    })),
                    isExpanded: false,
                });
            }

            const { data: users } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('role', 'student');

            setProjects(projectsWithMembers);
            setAllUsers((users as AllUsers[]) ?? []);
        } catch {
            setError('Unexpected error loading data.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [user]);

    function toggleExpandProject(projectId: string) {
        setProjects(prev =>
            prev.map(p => p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p)
        );
    }

    async function addMembersToProject(projectId: string) {
        const userIds = selectedUsersForProject[projectId] ?? [];
        if (!userIds.length) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        setError(null);

        for (const userId of userIds) {
            const already = project.teamMembers.some(m => m.id === userId);
            if (already) continue;

            const { error: addError } = await supabase
                .from('team_members')
                .insert({ team_id: project.team_id, user_id: userId, team_role: 'member' });

            if (addError) {
                setError(`Failed to add member: ${addError.message}`);
                return;
            }

            const selectedUser = allUsers.find(u => u.id === userId);
            if (selectedUser) {
                setProjects(prev =>
                    prev.map(p =>
                        p.id === projectId
                            ? { ...p, teamMembers: [...p.teamMembers, { ...selectedUser, team_role: 'member' }] }
                            : p
                    )
                );
            }
        }

        setSelectedUsersForProject(prev => ({ ...prev, [projectId]: [] }));
        setSearchQueries(prev => ({ ...prev, [projectId]: '' }));
    }

    async function setLeader(projectId: string, teamId: string, userId: string) {
        await supabase
            .from('team_members')
            .update({ team_role: 'member' })
            .eq('team_id', teamId);

        await supabase
            .from('team_members')
            .update({ team_role: 'leader' })
            .eq('team_id', teamId)
            .eq('user_id', userId);

        setProjects(prev =>
            prev.map(p =>
                p.id === projectId
                    ? {
                        ...p,
                        teamMembers: p.teamMembers.map(m => ({
                            ...m,
                            team_role: m.id === userId ? 'leader' : 'member',
                        })),
                    }
                    : p
            )
        );
    }

    async function removeMember(projectId: string, teamId: string, userId: string) {
        const { error: removeError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        if (removeError) { setError(`Failed to remove member: ${removeError.message}`); return; }

        setProjects(prev =>
            prev.map(p =>
                p.id === projectId
                    ? { ...p, teamMembers: p.teamMembers.filter(m => m.id !== userId) }
                    : p
            )
        );
    }

    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.loadingText}>Loading team management…</div>
            </div>
        );
    }

    if (error?.includes('do not have permission')) {
        return (
            <div className={styles.container}>
                <div className="form-error">{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.headerTitle}>Team management</h1>
                        <p className={styles.headerSubtitle}>
                            Manage teams and members across your projects
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Projects</div>
                            <div className={styles.statsValue}>{projects.length}</div>
                        </div>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Students</div>
                            <div className={styles.statsValue}>{allUsers.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {error && !error.includes('do not have permission') && (
                <div className={styles.errorBanner}>
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <FolderOpen size={32} color="var(--color-gray-soft)" />
                    <p className={styles.emptyTitle}>No projects found</p>
                    <p className={styles.emptySubtitle}>
                        Projects need to be created by an instructor first.
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
                                    <div className={styles.projectHeaderIcon}>
                                        <FolderOpen size={16} color="var(--color-primary)" />
                                    </div>
                                    <div>
                                        <div className={styles.projectName}>{project.name}</div>
                                        <div className={styles.projectMeta}>
                                            {project.teamMembers.length} member{project.teamMembers.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`${styles.projectChevron} ${project.isExpanded ? styles.projectChevronExpanded : ''}`}
                                />
                            </button>

                            {project.isExpanded && (
                                <div className={styles.projectBody}>
                                    {project.description && (
                                        <div className={styles.projectDescription}>{project.description}</div>
                                    )}

                                    <div className={styles.sectionLabel}>
                                        Team members ({project.teamMembers.length})
                                    </div>

                                    {project.teamMembers.length === 0 ? (
                                        <div className={styles.noMembers}>No members yet</div>
                                    ) : (
                                        <div className={styles.membersGrid}>
                                            {project.teamMembers.map(member => {
                                                const name = member.full_name ?? member.email;
                                                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                                return (
                                                    <div key={member.id} className={styles.memberCard}>
                                                        <div className={styles.memberInfo}>
                                                            <div className={styles.memberAvatar}>{initials}</div>
                                                            <div>
                                                                <div className={styles.memberName}>{name}</div>
                                                                <div className={styles.memberEmail}>
                                                                    {member.team_role === 'leader'
                                                                        ? <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Leader</span>
                                                                        : 'Member'
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {member.team_role !== 'leader' && user?.role === 'instructor' && (
                                                                <button
                                                                    onClick={() => setLeader(project.id, project.team_id, member.id)}
                                                                    className="btn btn-sm"
                                                                    style={{ fontSize: 11, padding: '4px 10px', color: 'var(--color-primary)' }}
                                                                >
                                                                    Set leader
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => removeMember(project.id, project.team_id, member.id)}
                                                                className={`btn btn-sm ${styles.removeBtn}`}
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className={styles.addMemberSection}>
                                        <div className={styles.sectionLabel}>
                                            Add members ({(selectedUsersForProject[project.id] ?? []).length} selected)
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQueries[project.id] ?? ''}
                                            onChange={e => setSearchQueries(prev => ({ ...prev, [project.id]: e.target.value }))}
                                            placeholder="Search by name or email"
                                            className="form-input"
                                            style={{ marginBottom: 8 }}
                                        />
                                        <div className={styles.studentList}>
                                            {(() => {
                                                const search = (searchQueries[project.id] ?? '').trim().toLowerCase();
                                                const filtered = allUsers
                                                    .filter(u => !project.teamMembers.some(m => m.id === u.id))
                                                    .filter(u => {
                                                        if (!search) return true;
                                                        return (
                                                            u.full_name?.toLowerCase().includes(search) ||
                                                            u.email.toLowerCase().includes(search)
                                                        );
                                                    });

                                                if (filtered.length === 0) {
                                                    return <div className={styles.noMembers}>No matching students found.</div>;
                                                }

                                                return filtered.map(student => {
                                                    const isSelected = (selectedUsersForProject[project.id] ?? []).includes(student.id);
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className={`${styles.studentItem} ${isSelected ? styles.studentItemSelected : ''}`}
                                                            onClick={() => {
                                                                setSelectedUsersForProject(prev => {
                                                                    const selected = prev[project.id] ?? [];
                                                                    return {
                                                                        ...prev,
                                                                        [project.id]: isSelected
                                                                            ? selected.filter(id => id !== student.id)
                                                                            : [...selected, student.id],
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => { }}
                                                                style={{ marginRight: 8, cursor: 'pointer' }}
                                                            />
                                                            <div>
                                                                <div className={styles.memberName}>{student.full_name ?? 'Unknown'}</div>
                                                                <div className={styles.memberEmail}>{student.email}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        <button
                                            onClick={() => addMembersToProject(project.id)}
                                            disabled={!(selectedUsersForProject[project.id]?.length > 0)}
                                            className="btn btn-primary btn-full"
                                            style={{ marginTop: 10 }}
                                        >
                                            Add {(selectedUsersForProject[project.id] ?? []).length || ''} member{(selectedUsersForProject[project.id]?.length ?? 0) !== 1 ? 's' : ''}
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