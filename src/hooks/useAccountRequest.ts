import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AccountRequestFormValues } from '../types/accountRequest';

export function useAccountRequest() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function submitRequest(values: AccountRequestFormValues) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await supabase
            .from('account_requests')
            .insert(values);

        if (sbError) {
            console.log('Supabase error:', sbError.message, sbError.code, sbError.details);
            setError('Failed to submit request. Please try again.');
        } else {
            setSuccess(true);
        }

        setLoading(false);
    }

    return { loading, error, success, submitRequest };
}