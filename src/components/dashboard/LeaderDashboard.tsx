import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, ClipboardList, CheckCircle, Clock, Users,
    Plus, FolderOpen, LayoutGrid, ArrowRight,
} from 'lucide-react';
import type { AppUser } from '../../types/auth';
import { useLeaderDashboard } from '../../hooks/useLeaderDashboard';
import GreetingBanner from './GreetingBanner';
import StatCard from './StatCard';
import ProjectProgress from './ProjectProgress';
import NotificationList from './NotificationList';
import UserChip from './UserChip';
import MemberActivityTable from './MemberActivityTable';
import RecentActivityFeed from './RecentActivityFeed';
import DeadlineCalendar from './DeadlineCalendar';
import styles from '../../styles/LeaderDashboard.module.css';

interface Props { user: AppUser; }

export default function LeaderDashboard({ user }: Props) {
    const navigate = useNavigate();
    const {
        projects, teams, memberActivity, recentActivity,
        calendarTasks, notifications, unreadCount,
        totalTasks, completedCount, inProgressCount,
        overdueTasks, loading, error,
        readNotification, readAll,
    } = useLeaderDashboard(user.id);

    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
    const [showNotifs, setShowNotifs] = useState(false);

    const updatedUser = { ...user, avatar_url: avatarUrl };

    if (loading) {
        return (
            <div className={styles.loadingWrap}>
                <div className={styles.spinner} />
            </div>
        );
    }

    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.page}>

            <div className={styles.topbar}>
                <div>
                    <p className={styles.topbarLabel}>Leader workspace</p>
                    <p className={styles.topbarDate}>
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                    </p>
                </div>
                <div className={styles.topbarRight}>
                    <div className={styles.notifWrap}>
                        <button className={styles.notifBtn} onClick={() => setShowNotifs(v => !v)}>
                            <Bell size={18} />
                            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                        </button>
                        {showNotifs && (
                            <div className={styles.notifDropdown}>
                                <NotificationList
                                    notifications={notifications}
                                    onRead={readNotification}
                                    onReadAll={readAll}
                                />
                            </div>
                        )}
                    </div>
                    <UserChip user={updatedUser} onAvatarUpdate={setAvatarUrl} />
                </div>
            </div>

            <GreetingBanner
                name={user.full_name}
                statValue={overdueTasks.length}
                statLabel="Overdue tasks"
                subMessage={
                    <>
                        Managing <strong>{projects.length} project{projects.length !== 1 ? 's' : ''}</strong> across <strong>{teams.length} team{teams.length !== 1 ? 's' : ''}</strong>.
                        {overdueTasks.length > 0
                            ? <> You have <strong>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</strong> that need attention.</>
                            : ' Everything is on track.'}
                    </>
                }
            />

            <div className={styles.statsRow}>
                <StatCard icon={ClipboardList} value={totalTasks} label="Total tasks" variant="purple" />
                <StatCard icon={CheckCircle} value={completedCount} label="Completed" variant="blue" />
                <StatCard icon={Clock} value={inProgressCount} label="In progress" variant="coral" />
                <StatCard icon={Users} value={teams.length} label="Teams" variant="green" />
            </div>

            <div className={styles.actionsRow}>
                <button className={styles.qaBtn} onClick={() => navigate('/tasks/new')}>
                    <div className={styles.qaIcon} style={{ background: 'rgba(62,213,152,0.12)', color: '#1a7a52' }}>
                        <Plus size={16} />
                    </div>
                    <div className={styles.qaText}>
                        <span className={styles.qaLabel}>New task</span>
                        <span className={styles.qaSub}>Add to a project</span>
                    </div>
                </button>
                <button className={styles.qaBtn} onClick={() => navigate('/projects')}>
                    <div className={styles.qaIcon} style={{ background: 'rgba(108,62,182,0.1)', color: 'var(--color-primary)' }}>
                        <FolderOpen size={16} />
                    </div>
                    <div className={styles.qaText}>
                        <span className={styles.qaLabel}>View projects</span>
                        <span className={styles.qaSub}>Browse all projects</span>
                    </div>
                </button>
                <button className={styles.qaBtn} onClick={() => navigate('/board')}>
                    <div className={styles.qaIcon} style={{ background: 'rgba(229,106,207,0.1)', color: 'var(--color-accent-pink)' }}>
                        <LayoutGrid size={16} />
                    </div>
                    <div className={styles.qaText}>
                        <span className={styles.qaLabel}>Open board</span>
                        <span className={styles.qaSub}>View all tasks</span>
                    </div>
                </button>
            </div>

            {overdueTasks.length > 0 && (
                <div className={styles.overdueCard}>
                    <div className={styles.overdueHeader}>
                        <span className={styles.overdueTitle}>Overdue tasks</span>
                        <button className={styles.cardLink} onClick={() => navigate('/board')}>
                            View all <ArrowRight size={12} />
                        </button>
                    </div>
                    {overdueTasks.slice(0, 3).map(task => {
                        const daysOverdue = Math.floor(
                            (Date.now() - new Date(task.due_date!).getTime()) / 86400000
                        );
                        return (
                            <div key={task.id} className={styles.overdueItem}>
                                <p className={styles.overdueTaskTitle}>{task.title}</p>
                                <span className={styles.overdueBadge}>
                                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className={styles.midGrid}>
                <div className={`${styles.card} ${styles.cardFlex}`}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>Project progress</span>
                        <button className={styles.cardLink} onClick={() => navigate('/projects')}>
                            View all <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className={styles.cardBody}>
                        <ProjectProgress projects={projects} />
                    </div>
                </div>

                <div className={`${styles.card} ${styles.cardFlex}`}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>Recent activity</span>
                    </div>
                    <div className={styles.cardBody}>
                        <RecentActivityFeed items={recentActivity} />
                    </div>
                </div>
            </div>

            <div className={styles.card} style={{ marginBottom: 16 }}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Team member activity</span>
                </div>
                <MemberActivityTable members={memberActivity} />
            </div>

            <div className={styles.card} style={{ marginBottom: 16 }}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Team deadlines calendar</span>
                </div>
                <DeadlineCalendar tasks={calendarTasks} />
            </div>

        </div>
    );
}