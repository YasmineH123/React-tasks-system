import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePasswordReset() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function sendResetEmail(email: string) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (sbError) {
            setError('Something went wrong. Please try again.');
        } else {
            setSuccess(true);
        }

        setLoading(false);
    }

    async function updatePassword(newPassword: string) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (sbError) {
            setError('Failed to update password. Please try again.');
        } else {
            setSuccess(true);
        }

        setLoading(false);
    }

    function reset() {
        setError(null);
        setSuccess(false);
    }

    return { loading, error, success, reset, sendResetEmail, updatePassword };
}