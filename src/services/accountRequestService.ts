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

export async function updateAccountRequestStatus(
    id: string,
    status: 'approved' | 'rejected'
) {
    const { error } = await supabase
        .from('account_requests')
        .update({ status })
        .eq('id', id);

    return { error };
}