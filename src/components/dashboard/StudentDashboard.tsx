import { useState } from 'react';
import { Bell, ClipboardList, CheckCircle, FolderOpen, ArrowRight, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppUser } from '../../types/auth';
import { useStudentDashboard } from '../../hooks/useDashboard';
import { getTasksDueThisWeek } from '../../utils/taskUtils';
import GreetingBanner from './GreetingBanner';
import StatCard from './StatCard';
import TaskList from './TaskList';
import DeadlineCalendar from './DeadlineCalendar';
import ProjectProgress from './ProjectProgress';
import NotificationList from './NotificationList';
import UserChip from './UserChip';
import styles from '../../styles/StudentDashboard.module.css';

interface Props { user: AppUser; }

export default function StudentDashboard({ user }: Props) {
    const navigate = useNavigate();
    const {
        tasks, projects, notifications, unreadCount,
        loading, error, readNotification, readAll,
    } = useStudentDashboard(user.id);

    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
    const [showNotifs, setShowNotifs] = useState(false);

    const dueThisWeek = getTasksDueThisWeek(tasks);
    const completedCount = tasks.filter(t => t.status === 'done').length;
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
                    <p className={styles.topbarLabel}>Student workspace</p>
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
                statValue={dueThisWeek.length}
                statLabel="Due this week"
                subMessage={
                    <>
                        You have <strong>{dueThisWeek.length} task{dueThisWeek.length !== 1 ? 's' : ''} due this week</strong>.
                        {dueThisWeek.length > 0 ? " Stay focused — you're doing great." : ' Nothing urgent. Keep it up!'}
                    </>
                }
            />

            <div className={styles.statsRow}>
                <StatCard icon={ClipboardList} value={tasks.length} label="Assigned tasks" variant="purple" />
                <StatCard icon={CheckCircle} value={completedCount} label="Completed" variant="blue" />
                <StatCard icon={FolderOpen} value={projects.length} label="Active projects" variant="coral" />
            </div>

            <div className={styles.mainGrid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>My tasks</span>
                        <button className={styles.cardLink} onClick={() => navigate('/board')}>
                            View all <ArrowRight size={13} />
                        </button>
                    </div>
                    <TaskList tasks={tasks} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardTitle}>Quick actions</span>
                        </div>
                        <div className={styles.qaList}>
                            <button className={styles.qaItem} onClick={() => navigate('/board')}>
                                <div className={styles.qaIcon} style={{ background: 'rgba(108,62,182,0.1)', color: 'var(--color-primary)' }}>
                                    <ClipboardList size={16} />
                                </div>
                                <span className={styles.qaLabel}>View my tasks</span>
                                <ArrowRight size={14} className={styles.qaArrow} />
                            </button>
                            <button className={styles.qaItem} onClick={() => navigate('/projects')}>
                                <div className={styles.qaIcon} style={{ background: 'rgba(62,213,152,0.12)', color: '#1a7a52' }}>
                                    <FolderOpen size={16} />
                                </div>
                                <span className={styles.qaLabel}>Browse projects</span>
                                <ArrowRight size={14} className={styles.qaArrow} />
                            </button>
                            <button className={styles.qaItem} onClick={() => navigate('/board')}>
                                <div className={styles.qaIcon} style={{ background: 'rgba(229,106,207,0.1)', color: 'var(--color-accent-pink)' }}>
                                    <LayoutGrid size={16} />
                                </div>
                                <span className={styles.qaLabel}>Project board</span>
                                <ArrowRight size={14} className={styles.qaArrow} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.card} style={{ flex: 1 }}>
                        <div className={styles.cardHeader} style={{ marginBottom: 12 }}>
                            <span className={styles.cardTitle}>Project progress</span>
                            <button className={styles.cardLink} onClick={() => navigate('/projects')}>
                                View all <ArrowRight size={13} />
                            </button>
                        </div>
                        <ProjectProgress projects={projects} />
                    </div>
                </div>
            </div>

            <div className={styles.calendarSection}>
                <DeadlineCalendar tasks={tasks} />
            </div>

        </div>
    );
}