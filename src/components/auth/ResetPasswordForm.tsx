import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePasswordReset } from '../../hooks/usePasswordReset';
import styles from '../../modules/LoginForm.module.css';

function isValidPassword(password: string): boolean {
    return /[A-Za-z]/.test(password) && /\d/.test(password);
}
export default function ResetPasswordForm() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [passerror, setError] = useState<string | null>(null);
    const { loading, error, success, updatePassword } = usePasswordReset();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        const validation : boolean = isValidPassword(password)
        
        if (!validation){
            setError('Password mst contain letters and numbers.');
            return;
        }
        
        await updatePassword(password);
    }

    if (success) {
        setTimeout(() => navigate('/login'), 2500);
        return (
            <div className={styles.successBox}>
                <p className={styles.successTitle}>Password updated</p>
                <p className={styles.successText}>
                    Your password has been changed. Redirecting you to sign in…
                </p>
            </div>
        );
    }

    const displayError = passerror ?? error;

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>New password</label>
                <input id="password" name="password" type="password" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" required />
            </div>

            <div className={styles.field}>
                <label htmlFor="confirm" className={styles.label}>Confirm password</label>
                <input id="confirm" name="confirm" type="password" className={styles.input} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
            </div>

            {displayError && <p className={styles.error}>{displayError}</p>}

            <button type="submit" className={styles.button} disabled={loading || !password || !confirm}
            >
                {loading ? 'Updating…' : 'Update password'}
            </button>
        </form>
    );
}