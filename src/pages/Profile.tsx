import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { updateUserProfile } from '../services/userService';
import styles from '../styles/Profile.module.css';

export default function Profile() {
  const { user, loading } = useAuthContext();
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const displayedFullName = fullName || user?.full_name || '';

  if (loading || !user) {
    return <div className={styles.loadingWrapper}>Loading profile...</div>;
  }

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    setStatus(null);

    const updatedName = fullName || user.full_name || null;
    const { error } = await updateUserProfile(user.id, { full_name: updatedName });
    if (error) {
      setStatus('Failed to update profile.');
    } else {
      setStatus('Profile updated successfully.');
    }

    setIsSaving(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Profile</h1>
        <p className={styles.headerSubtitle}>Edit your user information and access account tools.</p>
      </div>

      <div className={styles.card}>
        <label className={styles.label}>Full name</label>
        <input
          type="text"
          value={displayedFullName}
          onChange={e => setFullName(e.target.value)}
          className={styles.input}
          placeholder="Enter your full name"
        />

        <label className={styles.label}>Email</label>
        <input type="email" value={user.email} readOnly className={styles.disabledInput} />

        <label className={styles.label}>Role</label>
        <input type="text" value={user.role} readOnly className={styles.disabledInput} />

        <div className={styles.actions}>
          <button className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <a href="/reset-password" className={styles.resetLink}>
            Reset password
          </a>
        </div>

        {status && <div className={styles.statusMessage}>{status}</div>}
      </div>

      <div className={styles.tipBox}>
        <strong>Tip:</strong> You can add a profile picture and additional details in a future update.
      </div>
    </div>
  );
}
