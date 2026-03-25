import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAccountRequest } from '../../hooks/useAccountRequest';
import type { AccountRequestFormValues } from '../../types/accountRequest';
import styles from '../../modules/LoginForm.module.css';

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
        setValues(prev => ({ ...prev, [e.target.name]: e.target.value || null }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await submitRequest(values);
    }

    if (success) {
        return (
            <div className={styles.successBox}>
                <p className={styles.successTitle}>Request sent</p>
                <p className={styles.successText}>
                    Your request has been submitted. Your instructor will review it
                    and create your account. You'll receive your login details by email.
                </p>
                <Link to="/login" className={styles.link}>Back to sign in</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
                <label htmlFor="full_name" className={styles.label}>Full name</label>
                <input id="full_name" name="full_name" type="text" className={styles.input} value={values.full_name} onChange={handleChange} placeholder="Your full name" autoComplete="name" required/>
            </div>

            <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input id="email" name="email" type="email" className={styles.input} value={values.email} onChange={handleChange} placeholder="you@university.edu" autoComplete="email" required />
            </div>

            <div className={styles.field}>
                <label htmlFor="role" className={styles.label}>I am a</label>
                <select id="role" name="role" className={styles.input} value={values.role} onChange={handleChange}>
                    <option value="student">Student</option>
                    <option value="leader">Team leader</option>
                </select>
            </div>

            <div className={styles.field}>
                <label htmlFor="message" className={styles.label}>
                    Message <span className={styles.optional}>(optional)</span>
                </label>
                <textarea id="message" name="message" className={`${styles.input} ${styles.textarea}`} value={values.message ?? ''} onChange={handleChange} placeholder="Any additional context for your instructor…" rows={3} />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
                type="submit"
                className={styles.button}
                disabled={loading || !values.full_name || !values.email}
            >
                {loading ? 'Sending…' : 'Request account'}
            </button>

            <p className={styles.footer}>
                Already have an account?{' '}
                <Link to="/login" className={styles.link}>Sign in</Link>
            </p>
        </form>
    );
}