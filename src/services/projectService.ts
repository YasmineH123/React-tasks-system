import { supabase } from '../lib/supabaseClient';
import type { Project } from '../types/project';

export interface CreateProjectInput {
  name: string;
  description?: string;
  teamId: string;
  createdBy: string;
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

export async function updateProject(projectId: string, updates: Partial<CreateProjectInput>) {
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