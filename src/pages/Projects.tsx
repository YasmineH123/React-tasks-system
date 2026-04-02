import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { fetchAllProjects } from '../services/projectService';
import type { Project } from '../types/project';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Fetch all projects
        const { data: allProjects, error: allProjectsError } = await fetchAllProjects();
        if (allProjectsError) throw allProjectsError;
        setProjects(allProjects || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);


  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div>Loading projects...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'leader' && user.role !== 'instructor')) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ color: '#EF4444', fontWeight: 500 }}>
          Only team leaders and instructors can access this page
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Projects</h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          View and manage projects for your team
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 4, color: '#DC2626', fontSize: 14, marginBottom: 24 }}>
          {error}
        </div>
      )}


      {/* Projects List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Your Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 14, color: '#666' }}>
              No projects yet. Create one to get started!
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  padding: 16,
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: 'white',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                  {project.name}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: '#666',
                  margin: '0 0 12px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {project.description || 'No description'}
                </p>
                <div style={{ fontSize: 12, color: '#999' }}>
                  Team ID: {project.team_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
