import { supabase } from '../lib/supabaseClient';
import type { AppUser } from '../types/auth';

export async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    return { data: data as AppUser | null, error };
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<Pick<AppUser, 'full_name'>>
) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    return { data: data as AppUser | null, error };
}

export async function fetchAllStudents() {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('role', 'student');

    return { data, error };
}

export async function fetchAllUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role');

    return { data, error };
}