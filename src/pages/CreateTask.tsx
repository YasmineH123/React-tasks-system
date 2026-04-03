import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { ClipboardList } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    team_id: string;
}

interface Member {
    id: string;
    full_name: string | null;
    email: string;
}

export default function CreateTask() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLeaderOfAny, memberships } = useAuthContext();

    const defaultProjectId = searchParams.get('project') ?? '';
    const defaultProjectName = searchParams.get('name') ?? '';

    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        project_id: defaultProjectId,
        assigned_to: '',
        due_date: '',
    });

    useEffect(() => {
        async function load() {
            if (!user || !isLeaderOfAny) {
                setIsLoading(false);
                return;
            }

            const leaderTeamIds = memberships
                .filter(m => m.team_role === 'leader')
                .map(m => m.team_id);

            const { data: projectsData } = await supabase
                .from('projects')
                .select('id, name, team_id')
                .in('team_id', leaderTeamIds);

            setProjects((projectsData as Project[]) ?? []);
            setIsLoading(false);
        }

        load();
    }, [user, isLeaderOfAny, memberships]);

    useEffect(() => {
        async function loadMembers() {
            if (!form.project_id) { setMembers([]); return; }

            const project = projects.find(p => p.id === form.project_id);
            if (!project) return;

            const { data: memberRows } = await supabase
                .from('team_members')
                .select('user_id')
                .eq('team_id', project.team_id);

            const userIds = (memberRows ?? []).map((m: any) => m.user_id);
            if (!userIds.length) { setMembers([]); return; }

            const { data: usersData } = await supabase
                .from('users')
                .select('id, full_name, email')
                .in('id', userIds);

            setMembers((usersData as Member[]) ?? []);
            setForm(prev => ({ ...prev, assigned_to: '' }));
        }

        loadMembers();
    }, [form.project_id, projects]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !form.project_id || !form.title.trim()) return;

        setIsCreating(true);
        setError(null);

        const { data, error: insertError } = await supabase
            .from('tasks')
            .insert({
                title: form.title.trim(),
                description: form.description.trim() || null,
                project_id: form.project_id,
                assigned_to: form.assigned_to || null,
                due_date: form.due_date || null,
                status: 'todo',
            })
            .select()
            .single();

        if (insertError) {
            setError('Failed to create task. Please try again.');
            setIsCreating(false);
            return;
        }

        if (form.assigned_to && data) {
            await supabase.from('notifications').insert({
                user_id: form.assigned_to,
                type: 'new_task',
                message: `You were assigned: ${form.title.trim()}`,
                link: `/tasks/${data.id}`,
                is_read: false,
            });
        }

        navigate(form.project_id ? `/projects/${form.project_id}` : '/projects');
    }

    if (isLoading) {
        return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>;
    }

    if (!isLeaderOfAny) {
        return (
            <div style={{ padding: 32 }}>
                <p className="form-error">Only team leaders can create tasks.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 32, maxWidth: 580, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--gradient-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ClipboardList size={18} color="#fff" />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0 }}>
                        New task
                    </h1>
                </div>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
                    Create a task and assign it to a team member.
                </p>
                {defaultProjectName && (
                    <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, margin: '4px 0 0' }}>
                        Adding to: {defaultProjectName}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-field">
                    <label className="form-label">Project</label>
                    <select
                        className="form-input"
                        value={form.project_id}
                        onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}
                        required
                    >
                        <option value="">Select a project…</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label className="form-label">Task title</label>
                    <input
                        className="form-input"
                        type="text"
                        value={form.title}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Build login page"
                        required
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">
                        Description{' '}
                        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
                    </label>
                    <textarea
                        className="form-input"
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="What needs to be done?"
                        rows={3}
                        style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">
                        Assign to{' '}
                        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
                    </label>
                    <select
                        className="form-input"
                        value={form.assigned_to}
                        onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                        disabled={!form.project_id || members.length === 0}
                    >
                        <option value="">
                            {!form.project_id
                                ? 'Select a project first…'
                                : members.length === 0
                                    ? 'No members in this team'
                                    : 'Select a member…'
                            }
                        </option>
                        {members.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.full_name ?? m.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-field">
                    <label className="form-label">
                        Due date{' '}
                        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
                    </label>
                    <input
                        className="form-input"
                        type="date"
                        value={form.due_date}
                        onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>

                {error && <p className="form-error">{error}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => navigate(-1)}
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isCreating || !form.title.trim() || !form.project_id}
                        style={{ flex: 2, opacity: isCreating ? 0.7 : 1 }}
                    >
                        {isCreating ? 'Creating…' : 'Create task'}
                    </button>
                </div>
            </form>
        </div>
    );
}