import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Project } from '../types/project';

export default function Projects() {
  const navigate = useNavigate();
  const { user, isLeaderOfAny } = useAuthContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        const { data: memberRows } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        if (!memberRows?.length) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const teamIds = memberRows.map(r => r.team_id);

        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .in('team_id', teamIds);

        if (fetchError) throw fetchError;
        setProjects((data as Project[]) ?? []);
      } catch (err) {
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Loading projects...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Projects</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {projects.length} active project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user?.role === 'instructor' && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/projects/new')}
          >
            New project
          </button>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: 20 }}>{error}</p>}

      {projects.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: 'var(--card-glass)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.7)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            No projects yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{
                padding: 20,
                background: 'var(--card-glass)',
                backdropFilter: 'var(--blur)',
                border: '1px solid rgba(255,255,255,0.7)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {project.name}
              </h3>
              <p style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                margin: '0 0 12px 0',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {project.description || 'No description'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}