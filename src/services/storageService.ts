import { supabase } from '../lib/supabaseClient';

export async function uploadAvatar(userId: string, file: File) {
    const { error } = await supabase.storage
        .from('avatars')
        .upload(userId, file, { upsert: true });

    if (error) return { url: null, error };

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(userId);

    return { url: data.publicUrl, error: null };
}

export async function updateAvatarUrl(userId: string, url: string) {
    const { error } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', userId);

    return { error };
}