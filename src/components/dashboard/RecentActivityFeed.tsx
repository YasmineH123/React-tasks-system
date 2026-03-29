import { CheckCircle, Clock, AlertCircle, ClipboardList } from 'lucide-react';
import styles from '../../styles/RecentActivityFeed.module.css';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  users: { full_name: string | null } | null;
}

interface Props { items: ActivityItem[]; }

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getIcon(status: string, isOverdue: boolean) {
  if (isOverdue)                return { icon: <AlertCircle  size={15} />, bg: 'rgba(229,62,62,0.08)',   color: '#E53E3E' };
  if (status === 'done')        return { icon: <CheckCircle  size={15} />, bg: 'rgba(62,213,152,0.1)',   color: '#3ED598' };
  if (status === 'in_progress') return { icon: <Clock        size={15} />, bg: 'rgba(245,158,11,0.1)',   color: '#F59E0B' };
  return                               { icon: <ClipboardList size={15} />,bg: 'rgba(108,62,182,0.08)', color: 'var(--color-primary)' };
}

export default function RecentActivityFeed({ items }: Props) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return <p className={styles.empty}>No recent activity.</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {items.map(item => {
          const isOverdue = !!(item.due_date && new Date(item.due_date) < new Date() && item.status !== 'done');
          const { icon, bg, color } = getIcon(item.status, isOverdue);
          return (
            <div
              key={item.id}
              className={styles.item}
              onClick={() => navigate(`/tasks/${item.id}`)}
            >
              <div className={styles.icon} style={{ background: bg, color }}>
                {icon}
              </div>
              <div className={styles.body}>
                <p className={styles.text}>
                  {item.users?.full_name && <strong>{item.users.full_name}</strong>}
                  {item.users?.full_name ? ' · ' : ''}
                  <strong>{item.title}</strong>
                  {' '}
                  <span className={styles.status}>
                    {isOverdue ? 'overdue' : item.status.replace('_', ' ')}
                  </span>
                </p>
                <span className={styles.time}>{timeAgo(item.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={styles.showMore}
        onClick={() => navigate('/board')}
      >
        View all on board
      </button>
    </div>
  );
}