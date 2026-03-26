import BrandPanel from '../components/auth/BrandPanel';
import AuthCard from '../components/auth/AuthCard';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import styles from '../styles/Login.module.css';

export default function ForgotPassword() {
  return (
    <div className={styles.page}>
      <BrandPanel />
      <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}