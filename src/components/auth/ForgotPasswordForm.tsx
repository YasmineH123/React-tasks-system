import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePasswordReset } from '../../hooks/usePasswordReset';

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const { loading, error, success, sendResetEmail } = usePasswordReset();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await sendResetEmail(email);
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-primary)', margin: 0 }}>
                    Check your inbox
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    We sent a reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.
                </p>
                <Link to="/login" className="link">Back to sign in</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <div className="form-field">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    required
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !email}
            >
                {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                <Link to="/login" className="link">Back to sign in</Link>
            </p>
        </form>
    );
}