import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccountRequest } from '../../hooks/useAccountRequest';
import type { AccountRequestFormValues } from '../../types/accountRequest';

export default function RequestAccountForm() {
    const { loading, error, success, submitRequest } = useAccountRequest();

    const [values, setValues] = useState<AccountRequestFormValues>({
        full_name: '',
        email: '',
        role: 'student',
        message: null,
    });

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) {
        setValues(prev => ({
            ...prev,
            [e.target.name]: e.target.value === '' ? null : e.target.value,
        }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await submitRequest(values);
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-primary)', margin: 0 }}>
                    Request sent
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Your request has been submitted. Your instructor will review it and create your account.
                    You'll receive your login details by email.
                </p>
                <Link to="/login" className="link">Back to sign in</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <div className="form-field">
                <label htmlFor="full_name" className="form-label">Full name</label>
                <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    className="form-input"
                    value={values.full_name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                />
            </div>

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
                <label htmlFor="role" className="form-label">I am a</label>
                <select
                    id="role"
                    name="role"
                    className="form-input"
                    value={values.role}
                    onChange={handleChange}
                >
                    <option value="student">Student</option>
                    <option value="leader">Team leader</option>
                </select>
            </div>

            <div className="form-field">
                <label htmlFor="message" className="form-label">
                    Message{' '}
                    <span style={{ color: 'var(--color-gray-soft)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        (optional)
                    </span>
                </label>
                <textarea
                    id="message"
                    name="message"
                    className="form-input"
                    style={{ resize: 'vertical', minHeight: 80, fontFamily: 'var(--font-body)' }}
                    value={values.message ?? ''}
                    onChange={handleChange}
                    placeholder="Any additional context for your instructor…"
                    rows={3}
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !values.full_name || !values.email}
            >
                {loading ? 'Sending…' : 'Request account'}
            </button>

            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link to="/login" className="link">Sign in</Link>
            </p>
        </form>
    );
}