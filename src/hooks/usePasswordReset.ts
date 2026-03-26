import { useState } from 'react';
import { sendPasswordResetEmail, updateUserPassword } from '../services/authService';

export function usePasswordReset() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function sendResetEmail(email: string) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await sendPasswordResetEmail(email);

        if (sbError) setError('Something went wrong. Please try again.');
        else setSuccess(true);

        setLoading(false);
    }

    async function updatePassword(newPassword: string) {
        setLoading(true);
        setError(null);
        setSuccess(false);

        const { error: sbError } = await updateUserPassword(newPassword);

        if (sbError) setError('Failed to update password. Please try again.');
        else setSuccess(true);

        setLoading(false);
    }

    function reset() {
        setError(null);
        setSuccess(false);
    }

    return { loading, error, success, reset, sendResetEmail, updatePassword };
}