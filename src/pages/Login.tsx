import BrandPanel from '../components/auth/BrandPanel';
import AuthCard from '../components/auth/AuthCard';
import LoginForm from '../components/auth/LoginForm';
import styles from '../modules/Login.module.css';

export default function Login() {
    return (
        <div className={styles.page}>
            <BrandPanel />
            <AuthCard title="Welcome back" subtitle="Sign in to your workspace">
                <LoginForm />
            </AuthCard>
        </div>
    );
}