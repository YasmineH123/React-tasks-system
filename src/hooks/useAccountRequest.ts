import { useState } from 'react';
import { submitAccountRequest } from '../services/accountRequestService';
import type { AccountRequestFormValues } from '../types/accountRequest';

export function useAccountRequest() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function submitRequest(values: AccountRequestFormValues) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await submitAccountRequest(values);

        if (sbError) setError('Failed to submit request. Please try again.');
        else setSuccess(true);

        setLoading(false);
    }

    return { loading, error, success, submitRequest };
}