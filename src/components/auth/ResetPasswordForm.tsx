import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePasswordReset } from '../../hooks/usePasswordReset';

function isValidPassword(password: string): boolean {
    return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export default function ResetPasswordForm() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const { loading, error, success, updatePassword } = usePasswordReset();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLocalError(null);

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters.');
            return;
        }
        if (!isValidPassword(password)) {
            setLocalError('Password must contain letters and numbers.');
            return;
        }
        if (password !== confirm) {
            setLocalError('Passwords do not match.');
            return;
        }

        await updatePassword(password);
    }

    if (success) {
        setTimeout(() => navigate('/login'), 2500);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-primary)', margin: 0 }}>
                    Password updated
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Your password has been changed. Redirecting you to sign in…
                </p>
            </div>
        );
    }

    const displayError = localError ?? error;

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <div className="form-field">
                <label htmlFor="password" className="form-label">New password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters, letters + numbers"
                    autoComplete="new-password"
                    required
                />
            </div>

            <div className="form-field">
                <label htmlFor="confirm" className="form-label">Confirm password</label>
                <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    className="form-input"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                />
            </div>

            {displayError && <p className="form-error">{displayError}</p>}

            <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !password || !confirm}
            >
                {loading ? 'Updating…' : 'Update password'}
            </button>
        </form>
    );
}