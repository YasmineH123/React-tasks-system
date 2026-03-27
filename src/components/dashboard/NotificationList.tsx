import { Bell, MessageSquare, RefreshCw, ClipboardList } from 'lucide-react';
import type { Notification, NotificationType } from '../../types/notification';
import styles from '../../styles/NotificationList.module.css';

interface Props {
    notifications: Notification[];
    onRead: (id: string) => void;
    onReadAll: () => void;
}

const typeIcon: Record<NotificationType, React.ReactNode> = {
    new_task: <ClipboardList size={15} />,
    new_comment: <MessageSquare size={15} />,
    task_update: <RefreshCw size={15} />,
};

const typeColor: Record<NotificationType, string> = {
    new_task: 'rgba(108,62,182,0.1)',
    new_comment: 'rgba(62,213,152,0.1)',
    task_update: 'rgba(229,106,207,0.1)',
};

const typeIconColor: Record<NotificationType, string> = {
    new_task: 'var(--color-primary)',
    new_comment: '#1a7a52',
    task_update: 'var(--color-accent-pink)',
};

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationList({ notifications, onRead, onReadAll }: Props) {
    if (notifications.length === 0) {
        return (
            <div className={styles.empty}>
                <Bell size={28} color="var(--color-gray-soft)" />
                <p>No notifications yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <span className={styles.title}>Notifications</span>
                <button className={styles.readAll} onClick={onReadAll}>Mark all read</button>
            </div>
            <div className={styles.list}>
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                        onClick={() => !n.is_read && onRead(n.id)}
                    >
                        <div
                            className={styles.icon}
                            style={{
                                background: typeColor[n.type],
                                color: typeIconColor[n.type],
                            }}
                        >
                            {typeIcon[n.type]}
                        </div>
                        <div className={styles.body}>
                            <p className={styles.text}>{n.message}</p>
                            <span className={styles.time}>{timeAgo(n.created_at)}</span>
                        </div>
                        {!n.is_read && <span className={styles.dot} />}
                    </div>
                ))}
            </div>
        </div>
    );
}