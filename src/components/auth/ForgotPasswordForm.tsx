import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePasswordReset } from '../../hooks/usePasswordReset';
import styles from '../../modules/LoginForm.module.css';

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const { loading, error, success, sendResetEmail } = usePasswordReset();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await sendResetEmail(email);
    }

    if (success) {
        return (
            <div className={styles.successBox}>
                <p className={styles.successTitle}>Check your inbox</p>
                <p className={styles.successText}>
                    We sent a password reset link to <strong>{email}</strong>.
                    Check your spam folder if you don't see it.
                </p>
                <Link to="/login" className={styles.link}>Back to sign in</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    required
                />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
                type="submit"
                className={styles.button}
                disabled={loading || !email}
            >
                {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className={styles.footer}>
                <Link to="/login" className={styles.link}>Back to sign in</Link>
            </p>
        </form>
    );
}