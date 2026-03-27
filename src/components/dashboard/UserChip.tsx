import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppUser } from '../../types/auth';
import { uploadAvatar, updateAvatarUrl } from '../../services/storageService';
import { getInitials } from '../../utils/taskUtils';
import styles from '../../styles/UserChip.module.css';

interface Props {
    user: AppUser;
    onAvatarUpdate: (url: string) => void;
}

export default function UserChip({ user, onAvatarUpdate }: Props) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const { url, error } = await uploadAvatar(user.id, file);
        if (!error && url) {
            await updateAvatarUrl(user.id, url);
            onAvatarUpdate(url);
        }
    }

    return (
        <div className={styles.chip} onClick={() => navigate('/profile')}>
            <div className={styles.avatarWrap} onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.full_name ?? ''} className={styles.avatarImg} />
                    : <div className={styles.avatarInitials}>{getInitials(user.full_name)}</div>
                }
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            <div>
                <div className={styles.name}>{user.full_name ?? user.email}</div>
                <div className={styles.role}>{user.role}</div>
            </div>
        </div>
    );
}