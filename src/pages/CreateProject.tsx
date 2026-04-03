import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { createProject } from '../services/projectService';

interface Team {
  id: string;
  name: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedTeamId: '',
  });

  useEffect(() => {
    async function loadData() {
      if (!user || user.role !== 'instructor') {
        setIsLoading(false);
        return;
      }
      try {
        const teamsRes = await supabase.from('teams').select('id, name');
        if (teamsRes.error) throw teamsRes.error;
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

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

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

        <div className="form-field" style={{ position: 'relative' }}>
          <label className="form-label">Assign to team</label>
          <input
            type="text"
            placeholder="Search and select a team..."
            className="form-input"
            value={teamSearch}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            onChange={(e) => {
              setTeamSearch(e.target.value);
              setIsDropdownOpen(true);
              // Clear actual selected ID when user starts typing something new
              if (formData.selectedTeamId) {
                setFormData(p => ({ ...p, selectedTeamId: '' }));
              }
            }}
            required
            autoComplete="off"
            style={{ marginBottom: 0 }}
          />
          {isDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1px solid var(--color-gray-soft)',
              borderRadius: 'var(--radius-md)', zIndex: 10,
              maxHeight: 200, overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
              marginTop: '4px'
            }}>
              {filteredTeams.length === 0 ? (
                <div style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  No teams found
                </div>
              ) : (
                filteredTeams.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                      borderBottom: '1px solid var(--color-bg-solid)',
                      background: formData.selectedTeamId === t.id ? 'var(--color-bg-solid)' : 'transparent',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-solid)')}
                    onMouseOut={(e) => {
                      if (formData.selectedTeamId !== t.id) e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() => {
                      setFormData(p => ({ ...p, selectedTeamId: t.id }));
                      setTeamSearch(t.name);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {t.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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