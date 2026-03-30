import { supabase } from '../lib/supabaseClient';
import type { Project } from '../types/project';

export interface CreateProjectInput {
  name: string;
  description?: string;
  teamId: string;
  createdBy: string;
}

export interface CreateProjectWithStudentsInput {
  name: string;
  description?: string;
  createdBy: string;
  studentIds: string[];
}

export async function createProject(input: CreateProjectInput) {
  const { name, description, teamId, createdBy } = input;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description: description || null,
      team_id: teamId,
      created_by: createdBy,
    })
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function createProjectWithStudents(input: CreateProjectWithStudentsInput) {
  const { name, description, createdBy, studentIds } = input;

  try {
    console.log('Creating project with students:', { name, studentIds });

    // 1. Create a new team for this project
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: `${name} Team`,
        created_by: createdBy,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Team creation error:', teamError);
      throw new Error(`Failed to create team: ${teamError.message}`);
    }
    const teamId = (teamData as { id: string }).id;
    console.log('Team created:', teamId);

    // 2. Create the project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        team_id: teamId,
        created_by: createdBy,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw new Error(`Failed to create project: ${projectError.message}`);
    }
    console.log('Project created:', projectData);

    // 3. Add students to the team
    if (studentIds.length > 0) {
      const teamMembersData = studentIds.map(userId => ({
        team_id: teamId,
        user_id: userId,
      }));

      console.log('Adding team members:', teamMembersData);
      const { error: membersError } = await supabase
        .from('team_members')
        .insert(teamMembersData);

      if (membersError) {
        console.error('Team members error:', membersError);
        throw new Error(`Failed to add members: ${membersError.message}`);
      }
      console.log('Team members added successfully');
    }

    return { data: projectData as Project | null, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('createProjectWithStudents error:', errorMessage);
    return { data: null, error: new Error(errorMessage) };
  }
}

export async function fetchProjectsByTeamId(teamId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('team_id', teamId);

  return { data: data as Project[] | null, error };
}

export async function fetchAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*');

  return { data: data as Project[] | null, error };
}

export async function updateProject(projectId: string, updates: Partial<CreateProjectInput & { id: string }>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  return { error };
}
