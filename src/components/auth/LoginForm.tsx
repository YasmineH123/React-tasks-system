import { useState } from 'react';
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../../services/authService';
import type { LoginFormValues } from '../../types/auth';
import styles from '../../styles/LoginForm.module.css';

export default function LoginForm() {
    const navigate = useNavigate();

    const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: authError } = await signIn(values.email, values.password);

        if (authError) {
            setError('Invalid email or password. Please try again.');
            setLoading(false);
            return;
        }

        navigate('/dashboard');
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className="form-field">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    value={values.email}
                    onChange={handleChange}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    required
                />
            </div>

            <div className="form-field">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    className="form-input"
                    value={values.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !values.email || !values.password}
            >
                {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot your password?
            </Link>

            <p className={styles.footer}>
                Don't have an account?{' '}
                <Link to="/request-account" className="link">Request access</Link>
            </p>
        </form>
    );
}