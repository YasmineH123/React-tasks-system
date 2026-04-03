import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Users, LayoutList, Target, Plus } from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  team_id: string;
  teams: { name: string } | null;
  tasks: { id: string; status: string }[];
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        let teamIds: string[] = [];

        // Determine which projects we can access
        if (user.role !== 'instructor') {
          const { data: memberRows } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id);

          if (!memberRows?.length) {
            setProjects([]);
            setIsLoading(false);
            return;
          }
          teamIds = memberRows.map(r => r.team_id);
        }

        // Fetch projects + their team names + their task info
        let query = supabase
          .from('projects')
          .select('id, name, description, created_at, team_id, teams(name), tasks(id, status)')
          .order('created_at', { ascending: false });

        if (user.role !== 'instructor') {
           query = query.in('team_id', teamIds);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        
        // Supabase returns nested objects, we'll map them explicitly to ensure type safety
        const formattedData: ProjectData[] = (data || []).map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            created_at: d.created_at,
            team_id: d.team_id,
            teams: Array.isArray(d.teams) ? d.teams[0] : d.teams,
            tasks: d.tasks || []
        }));

        setProjects(formattedData);
      } catch (err) {
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-primary)' }}>Loading projects...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>Projects</h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: 0 }}>
            {projects.length} active project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user?.role === 'instructor' && (
          <button
            className="btn btn-primary"
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            onClick={() => navigate('/projects/new')}
          >
            <Plus size={18} /> New project
          </button>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: 20 }}>{error}</p>}

      {projects.length === 0 ? (
        <div style={{
          padding: 64,
          textAlign: 'center',
          background: 'var(--card-glass)',
          borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--color-gray-soft)',
        }}>
          <Target size={40} color="var(--color-gray-soft)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>No projects yet.</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Get started by creating a new project or assigning teams.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {projects.map(project => {
             const totalTasks = project.tasks.length;
             const completedTasks = project.tasks.filter(t => t.status === 'done').length;
             const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
             const teamName = project.teams?.name || 'Unassigned Team';

             return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 24,
                  background: 'var(--card-glass)',
                  backdropFilter: 'var(--blur)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  e.currentTarget.style.border = '1px solid var(--color-primary-light)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.7)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: 20 }}>
                        <Users size={14} color="var(--color-primary)" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{teamName}</span>
                    </div>
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {project.name}
                </h3>
                
                <p style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--color-text-secondary)',
                  margin: '0 0 24px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                  flexGrow: 1
                }}>
                  {project.description || 'No description provided for this project.'}
                </p>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-text-secondary)' }}>
                            <LayoutList size={14} />
                            <span>{completedTasks} / {totalTasks} Tasks</span>
                        </div>
                        <span style={{ color: progressPercentage === 100 ? 'var(--color-green-dark)' : 'var(--color-text-primary)' }}>
                            {progressPercentage}%
                        </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 6, background: 'var(--color-bg-solid)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progressPercentage}%`, 
                            height: '100%', 
                            background: progressPercentage === 100 ? 'var(--color-green-dark)' : 'var(--color-primary)',
                            borderRadius: 4,
                            transition: 'width 0.8s ease-in-out'
                        }} />
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}