import BrandPanel from '../components/auth/BrandPanel';
import AuthCard from '../components/auth/AuthCard';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import styles from '../modules/Login.module.css';

export default function ResetPassword() {
  return (
    <div className={styles.page}>
      <BrandPanel />
      <AuthCard
        title="Set new password"
        subtitle="Choose a strong password for your account"
      >
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}