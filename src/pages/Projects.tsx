import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { createProjectWithStudents, fetchAllProjects } from '../services/projectService';
import type { Project } from '../types/project';

interface Student {
  id: string;
  full_name: string | null;
  email: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedStudents: [] as string[],
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Fetch all projects
        const { data: allProjects, error: allProjectsError } = await fetchAllProjects();
        if (allProjectsError) throw allProjectsError;
        setProjects(allProjects || []);

        // Fetch all students and leaders
        const { data: allStudents, error: studentsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('role', ['student', 'leader']);

        if (studentsError) throw studentsError;
        setStudents((allStudents as Student[]) || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  function handleStudentToggle(studentId: string) {
    setFormData(prev => {
      const isSelected = prev.selectedStudents.includes(studentId);
      return {
        ...prev,
        selectedStudents: isSelected
          ? prev.selectedStudents.filter(id => id !== studentId)
          : [...prev.selectedStudents, studentId],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user || (user.role !== 'leader' && user.role !== 'instructor')) {
      setError('Only team leaders and instructors can create projects');
      return;
    }

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: createError } = await createProjectWithStudents({
        name: formData.name,
        description: formData.description || undefined,
        createdBy: user.id,
        studentIds: formData.selectedStudents,
      });

      if (createError) throw createError;

      if (data) {
        setProjects(prev => [...prev, data]);
        setFormData(prev => ({
          ...prev,
          name: '',
          description: '',
          selectedStudents: [],
        }));
        alert('Project created successfully!');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Error creating project:', errorMsg);
      setError(`Failed to create project: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  }

  const normalizedSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = students.filter(student => {
    if (!normalizedSearch) return true;
    return (
      student.full_name?.toLowerCase().includes(normalizedSearch) ||
      student.email.toLowerCase().includes(normalizedSearch)
    );
  });

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
          Create and manage projects for your team
        </p>
      </div>

      {/* Create Project Form */}
      <div style={{
        padding: 24,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        marginBottom: 32,
        border: '1px solid #E5E7EB',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Create New Project</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Project Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter project description"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Select Team Members ({formData.selectedStudents.length} selected)
            </label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by name or email"
              style={{
                width: '100%',
                padding: '8px 10px',
                marginBottom: 8,
                borderRadius: 4,
                border: '1px solid #D1D5DB',
                fontSize: 13,
              }}
            />
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: 4,
              padding: '8px',
            }}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: '12px', color: '#666', fontSize: 13 }}>No matching members found.</div>
              ) : (
                filteredStudents.map(student => (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: 4,
                      backgroundColor: formData.selectedStudents.includes(student.id) ? '#E0D4F7' : 'transparent',
                    }}
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedStudents.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      style={{ marginRight: 8, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {student.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {student.email}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && (
            <div style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 4, color: '#DC2626', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating || !formData.name.trim()}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6C3EB6',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: isCreating || !formData.name.trim() ? 'not-allowed' : 'pointer',
              opacity: isCreating || !formData.name.trim() ? 0.6 : 1,
            }}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>

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
