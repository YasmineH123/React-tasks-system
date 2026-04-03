import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { createProject } from '../services/projectService';

interface Student {
  id: string;
  full_name: string | null;
  email: string;
}

interface Team {
  id: string;
  name: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedTeamId: '',
    selectedLeaderId: '',
  });

  useEffect(() => {
    async function loadData() {
      if (!user || user.role !== 'instructor') {
        setIsLoading(false);
        return;
      }
      try {
        const [studentsRes, teamsRes] = await Promise.all([
          supabase.from('users').select('id, full_name, email').eq('role', 'student'),
          supabase.from('teams').select('id, name'),
        ]);
        if (studentsRes.error) throw studentsRes.error;
        if (teamsRes.error) throw teamsRes.error;
        setStudents((studentsRes.data as Student[]) ?? []);
        setTeams((teamsRes.data as Team[]) ?? []);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user || user.role !== 'instructor') {
      setError('Only instructors can create projects');
      return;
    }
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!formData.selectedTeamId) {
      setError('Please select a team');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: createError } = await createProject({
        name: formData.name,
        description: formData.description || undefined,
        teamId: formData.selectedTeamId,
        createdBy: user.id,
      });

      if (createError) throw createError;

      if (formData.selectedLeaderId && data) {
        await supabase
          .from('team_members')
          .update({ team_role: 'leader' })
          .eq('team_id', formData.selectedTeamId)
          .eq('user_id', formData.selectedLeaderId);
      }

      if (data) {
        navigate('/projects');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create project: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  }

  const teamMembers = formData.selectedTeamId
    ? students.filter(s =>
      s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
    )
    : [];

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Loading...</div>;
  }

  if (!user || user.role !== 'instructor') {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ color: '#EF4444', fontWeight: 500 }}>Only instructors can access this page</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          New project
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Create a project and assign it to an existing team.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="form-field">
          <label className="form-label">Project name</label>
          <input
            className="form-input"
            type="text"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Collab System"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
          <textarea
            className="form-input"
            value={formData.description}
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="What is this project about?"
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Assign to team</label>
          <select
            className="form-input"
            value={formData.selectedTeamId}
            onChange={e => setFormData(p => ({ ...p, selectedTeamId: e.target.value, selectedLeaderId: '' }))}
            required
          >
            <option value="">Select a team…</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {formData.selectedTeamId && (
          <div className="form-field">
            <label className="form-label">Designate team leader <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
            <select
              className="form-input"
              value={formData.selectedLeaderId}
              onChange={e => setFormData(p => ({ ...p, selectedLeaderId: e.target.value }))}
            >
              <option value="">No leader yet…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={isCreating || !formData.name.trim() || !formData.selectedTeamId}
        >
          {isCreating ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  );
}