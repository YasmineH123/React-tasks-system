import BrandPanel from '../components/auth/BrandPanel';
import AuthCard from '../components/auth/AuthCard';
import RequestAccountForm from '../components/auth/RequestAccountForm';
import styles from '../modules/Login.module.css';

export default function RequestAccount() {
  return (
    <div className={styles.page}>
      <BrandPanel />
      <AuthCard
        title="Request access"
        subtitle="Your instructor will review and create your account"
      >
        <RequestAccountForm />
      </AuthCard>
    </div>
  );
}