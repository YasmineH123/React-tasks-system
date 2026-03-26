import { supabase } from '../lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function sendPasswordResetEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
}

export async function updateUserPassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
}

export function onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
) {
    return supabase.auth.onAuthStateChange(callback);
}