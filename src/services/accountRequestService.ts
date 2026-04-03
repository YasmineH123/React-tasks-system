import { supabase } from '../lib/supabaseClient';
import type { AccountRequestFormValues, AccountRequest } from '../types/accountRequest';

export async function submitAccountRequest(values: AccountRequestFormValues) {
    const { error } = await supabase
        .from('account_requests')
        .insert(values);
    return { error };
}

export async function fetchAllAccountRequests() {
    const { data, error } = await supabase
        .from('account_requests')
        .select('*')
        .order('created_at', { ascending: false });
    return { data: data as AccountRequest[] | null, error };
}

export async function approveAccountRequest(id: string) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        return { error: new Error('No active session') };
    }

    const response = await fetch(
        'https://moliabvuugraoecrirjf.supabase.co/functions/v1/approve-account-request',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ request_id: id }),
        }
    );

    const data = await response.json();
    if (!response.ok) return { error: new Error(data?.error ?? 'Function call failed') };
    if (data?.error) return { error: new Error(data.error) };
    return { error: null, data };
}

export async function rejectAccountRequest(id: string) {
    const { error } = await supabase
        .from('account_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
    return { error };
}

export async function createUserDirectly(
    email: string,
    full_name: string,
    role: string
) {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
        'https://moliabvuugraoecrirjf.supabase.co/functions/v1/approve-account-request',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                direct_email: email,
                direct_name: full_name,
                direct_role: role,
            }),
        }
    );

    const data = await response.json();
    if (!response.ok) return { error: new Error(data?.error ?? 'Failed to create user') };
    return { error: null };
}