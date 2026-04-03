import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { Users, ChevronDown, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { AppUser } from '../types/auth';
import styles from '../styles/TeamManagement.module.css';

interface TeamMember extends Pick<AppUser, 'id' | 'full_name' | 'email'> {
    team_role: string;
}

interface TeamWithMembers {
    id: string;
    name: string;
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

    const [teams, setTeams] = useState<TeamWithMembers[]>([]);
    const [allUsers, setAllUsers] = useState<AllUsers[]>([]);
    const [selectedUsersForTeam, setSelectedUsersForTeam] = useState<Record<string, string[]>>({});
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newTeamName, setNewTeamName] = useState('');
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    async function loadData() {
        if (!user) return;
        setIsLoading(true);
        setError(null);

        try {
            let teamsList: any[] = [];
            const isInstructor = user.role === 'instructor';

            if (isInstructor) {
                const { data, error: teamError } = await supabase
                    .from('teams')
                    .select('id, name');
                if (teamError) throw teamError;
                teamsList = data ?? [];
            } else if (isLeaderOfAny) {
                const { data: memberRows } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user.id)
                    .eq('team_role', 'leader');

                const teamIds = (memberRows ?? []).map((m: any) => m.team_id);

                if (teamIds.length > 0) {
                    const { data, error: teamError } = await supabase
                        .from('teams')
                        .select('id, name')
                        .in('id', teamIds);
                    if (teamError) throw teamError;
                    teamsList = data ?? [];
                }
            } else {
                setError('You do not have permission to access this page.');
                setIsLoading(false);
                return;
            }

            const teamsWithMembers: TeamWithMembers[] = [];

            for (const team of teamsList) {
                const { data: teamMemberRows } = await supabase
                    .from('team_members')
                    .select('user_id, team_role')
                    .eq('team_id', team.id);

                const memberIds = (teamMemberRows ?? []).map((m: any) => m.user_id);
                const roleMap = new Map((teamMemberRows ?? []).map((m: any) => [m.user_id, m.team_role]));

                const { data: userData } = memberIds.length > 0
                    ? await supabase.from('users').select('id, full_name, email').in('id', memberIds)
                    : { data: [] };

                teamsWithMembers.push({
                    id: team.id,
                    name: team.name,
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

            setTeams(teamsWithMembers);
            setAllUsers((users as AllUsers[]) ?? []);
        } catch {
            setError('Unexpected error loading data.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [user, isLeaderOfAny]);

    function toggleExpandTeam(teamId: string) {
        setTeams(prev =>
            prev.map(t => t.id === teamId ? { ...t, isExpanded: !t.isExpanded } : t)
        );
    }

    async function handleCreateTeam(e: React.FormEvent) {
        e.preventDefault();
        if (!newTeamName.trim() || user?.role !== 'instructor') return;

        setIsCreatingTeam(true);
        setError(null);

        const { data, error: insertError } = await supabase
            .from('teams')
            .insert({ name: newTeamName.trim() })
            .select()
            .single();

        setIsCreatingTeam(false);

        if (insertError) {
            setError(`Failed to create team: ${insertError.message}`);
            return;
        }

        setNewTeamName('');
        if (data) {
            setTeams(prev => [
                ...prev,
                { id: data.id, name: data.name, teamMembers: [], isExpanded: true }
            ]);
        }
    }

    async function handleDeleteTeam(teamId: string) {
        if (user?.role !== 'instructor') return;
        const confirmDelete = window.confirm("Are you sure you want to delete this team?");
        if (!confirmDelete) return;

        const { error: deleteError } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);

        if (deleteError) {
            setError(`Failed to delete team: ${deleteError.message}`);
            return;
        }

        setTeams(prev => prev.filter(t => t.id !== teamId));
    }

    async function addMembersToTeam(teamId: string) {
        const userIds = selectedUsersForTeam[teamId] ?? [];
        if (!userIds.length) return;

        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        setError(null);

        for (const userId of userIds) {
            const already = team.teamMembers.some(m => m.id === userId);
            if (already) continue;

            const { error: addError } = await supabase
                .from('team_members')
                .insert({ team_id: team.id, user_id: userId, team_role: 'member' });

            if (addError) {
                setError(`Failed to add member: ${addError.message}`);
                return;
            }

            const selectedUser = allUsers.find(u => u.id === userId);
            if (selectedUser) {
                setTeams(prev =>
                    prev.map(t =>
                        t.id === teamId
                            ? { ...t, teamMembers: [...t.teamMembers, { ...selectedUser, team_role: 'member' }] }
                            : t
                    )
                );
            }
        }

        setSelectedUsersForTeam(prev => ({ ...prev, [teamId]: [] }));
        setSearchQueries(prev => ({ ...prev, [teamId]: '' }));
    }

    async function setLeader(teamId: string, userId: string) {
        await supabase
            .from('team_members')
            .update({ team_role: 'member' })
            .eq('team_id', teamId);

        await supabase
            .from('team_members')
            .update({ team_role: 'leader' })
            .eq('team_id', teamId)
            .eq('user_id', userId);

        setTeams(prev =>
            prev.map(t =>
                t.id === teamId
                    ? {
                        ...t,
                        teamMembers: t.teamMembers.map(m => ({
                            ...m,
                            team_role: m.id === userId ? 'leader' : 'member',
                        })),
                    }
                    : t
            )
        );
    }

    async function removeMember(teamId: string, userId: string) {
        const confirmRemove = window.confirm("Are you sure you want to remove this member from the team?");
        if (!confirmRemove) return;

        const { error: removeError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        if (removeError) { setError(`Failed to remove member: ${removeError.message}`); return; }

        setTeams(prev =>
            prev.map(t =>
                t.id === teamId
                    ? { ...t, teamMembers: t.teamMembers.filter(m => m.id !== userId) }
                    : t
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
                        <h1 className={styles.headerTitle}>Team Management</h1>
                        <p className={styles.headerSubtitle}>
                            Manage teams and assign members
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Teams</div>
                            <div className={styles.statsValue}>{teams.length}</div>
                        </div>
                        <div className={styles.statsCard}>
                            <div className={styles.statsLabel}>Students</div>
                            <div className={styles.statsValue}>{allUsers.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {error && !error.includes('do not have permission') && (
                <div className={styles.errorBanner} style={{ marginBottom: 16, display: 'flex', gap: 8, padding: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 8 }}>
                    <AlertCircle size={14} style={{ marginTop: 2 }} />
                    {error}
                </div>
            )}

            {user?.role === 'instructor' && (
                <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-gray-soft)' }}>
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="New team name..."
                        className="form-input"
                        style={{ flex: 1, margin: 0 }}
                        required
                    />
                    <button type="submit" disabled={isCreatingTeam || !newTeamName.trim()} className="btn btn-primary" style={{ display: 'flex', gap: '6px', alignItems: 'center', margin: 0 }}>
                        <Plus size={16} /> {isCreatingTeam ? 'Creating...' : 'Create Team'}
                    </button>
                </form>
            )}

            {teams.length === 0 ? (
                <div className={styles.emptyState}>
                    <Users size={32} color="var(--color-gray-soft)" />
                    <p className={styles.emptyTitle}>No teams found</p>
                    <p className={styles.emptySubtitle}>
                        Teams need to be created by an instructor first.
                    </p>
                </div>
            ) : (
                <div className={styles.projectList}>
                    {teams.map(team => (
                        <div key={team.id} className={styles.projectCard}>
                            <div className={styles.projectHeaderBtn} style={{ cursor: 'default' }}>
                                <div className={styles.projectHeaderLeft} style={{ cursor: 'pointer' }} onClick={() => toggleExpandTeam(team.id)}>
                                    <div className={styles.projectHeaderIcon}>
                                        <Users size={16} color="var(--color-primary)" />
                                    </div>
                                    <div>
                                        <div className={styles.projectName}>{team.name}</div>
                                        <div className={styles.projectMeta}>
                                            {team.teamMembers.length} member{team.teamMembers.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user?.role === 'instructor' && (
                                        <button 
                                            onClick={() => handleDeleteTeam(team.id)} 
                                            className={`btn btn-sm ${styles.removeBtn}`}
                                            title="Delete Team"
                                            style={{ zIndex: 10, position: 'relative' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => toggleExpandTeam(team.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                        <ChevronDown
                                            size={16}
                                            className={`${styles.projectChevron} ${team.isExpanded ? styles.projectChevronExpanded : ''}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {team.isExpanded && (
                                <div className={styles.projectBody}>
                                    <div className={styles.sectionLabel}>
                                        Team members ({team.teamMembers.length})
                                    </div>

                                    {team.teamMembers.length === 0 ? (
                                        <div className={styles.noMembers}>No members yet</div>
                                    ) : (
                                        <div className={styles.membersGrid}>
                                            {team.teamMembers.sort((a, b) => a.team_role === 'leader' ? -1 : 1).map(member => {
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
                                                            {member.team_role !== 'leader' && (user?.role === 'instructor' || isLeaderOfAny) && (
                                                                <button
                                                                    onClick={() => setLeader(team.id, member.id)}
                                                                    className="btn btn-sm"
                                                                    style={{ fontSize: 11, padding: '4px 10px', color: 'var(--color-primary)' }}
                                                                >
                                                                    Set leader
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => removeMember(team.id, member.id)}
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
                                            Add members ({(selectedUsersForTeam[team.id] ?? []).length} selected)
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQueries[team.id] ?? ''}
                                            onChange={e => setSearchQueries(prev => ({ ...prev, [team.id]: e.target.value }))}
                                            placeholder="Search by name or email"
                                            className="form-input"
                                            style={{ marginBottom: 8 }}
                                        />
                                        <div className={styles.studentList}>
                                            {(() => {
                                                const search = (searchQueries[team.id] ?? '').trim().toLowerCase();
                                                const filtered = allUsers
                                                    .filter(u => !team.teamMembers.some(m => m.id === u.id))
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
                                                    const isSelected = (selectedUsersForTeam[team.id] ?? []).includes(student.id);
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className={`${styles.studentItem} ${isSelected ? styles.studentItemSelected : ''}`}
                                                            onClick={() => {
                                                                setSelectedUsersForTeam(prev => {
                                                                    const selected = prev[team.id] ?? [];
                                                                    return {
                                                                        ...prev,
                                                                        [team.id]: isSelected
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
                                            onClick={() => addMembersToTeam(team.id)}
                                            disabled={!(selectedUsersForTeam[team.id]?.length > 0)}
                                            className="btn btn-primary btn-full"
                                            style={{ marginTop: 10 }}
                                        >
                                            Add {(selectedUsersForTeam[team.id] ?? []).length || ''} member{(selectedUsersForTeam[team.id]?.length ?? 0) !== 1 ? 's' : ''}
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