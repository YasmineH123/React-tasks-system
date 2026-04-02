import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, FolderOpen, Users, User, TrendingUp,
} from 'lucide-react';
import type { AppUser } from '../../types/auth';
import { useInstructorDashboard } from '../../hooks/useInstructorDashboard';
import { approveAccountRequest, rejectAccountRequest } from '../../services/accountRequestService';
import GreetingBanner from './GreetingBanner';
import StatCard from './StatCard';
import ProjectProgress from './ProjectProgress';
import NotificationList from './NotificationList';
import UserChip from './UserChip';
import { getInitials } from '../../utils/taskUtils';
import styles from '../../styles/InstructorDashboard.module.css';

interface Props { user: AppUser; }

declare var Chart: any;

export default function InstructorDashboard({ user }: Props) {
    const navigate = useNavigate();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInst = useRef<any>(null);

    const {
        projects, teams, students, memberActivity, pendingRequests,
        notifications, unreadCount,
        doneTasks, inProgTasks, todoTasks, avgCompletion,
        loading, error,
        readNotification, readAll, removeRequest,
    } = useInstructorDashboard(user.id);

    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
    const [showNotifs, setShowNotifs] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const updatedUser = { ...user, avatar_url: avatarUrl };

    useEffect(() => {
        if (loading) return;
        if (!chartRef.current) return;
        if (typeof Chart === 'undefined') return;

        if (chartInst.current) chartInst.current.destroy();

        chartInst.current = new Chart(chartRef.current, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [doneTasks || 1, inProgTasks, todoTasks],
                    backgroundColor: ['#9B6DE3', '#F59E0B', '#D8CDFF'],
                    borderWidth: 0,
                    hoverOffset: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
            },
        });

        return () => { chartInst.current?.destroy(); };
    }, [loading, doneTasks, inProgTasks, todoTasks]);

    async function handleApprove(id: string) {
        setApprovingId(id);
        const { error } = await approveAccountRequest(id);
        if (!error) removeRequest(id);
        setApprovingId(null);
    }

    async function handleReject(id: string) {
        setApprovingId(id);
        const { error } = await rejectAccountRequest(id);
        if (!error) removeRequest(id);
        setApprovingId(null);
    }

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
                    <p className={styles.topbarLabel}>Instructor workspace</p>
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
                statValue={pendingRequests.length}
                statLabel="Pending requests"
                subMessage={
                    <>
                        Monitoring <strong>{teams.length} team{teams.length !== 1 ? 's' : ''}</strong> across{' '}
                        <strong>{projects.length} active project{projects.length !== 1 ? 's' : ''}</strong>.
                        {pendingRequests.length > 0
                            ? <> You have <strong>{pendingRequests.length} pending account request{pendingRequests.length !== 1 ? 's' : ''}</strong>.</>
                            : ' Everything is running smoothly.'}
                    </>
                }
            />

            <div className={styles.statsRow}>
                <StatCard icon={FolderOpen} value={projects.length} label="Active projects" variant="purple" />
                <StatCard icon={Users} value={teams.length} label="Teams" variant="blue" />
                <StatCard icon={User} value={students.length} label="Students" variant="coral" />
                <StatCard icon={TrendingUp} value={`${avgCompletion}%`} label="Avg completion" variant="green" />
            </div>

            <div className={styles.mainGrid}>
                <div>
                    {pendingRequests.length > 0 && (
                        <div className={styles.card} style={{ marginBottom: 16 }}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitleRow}>
                                    <span className={styles.cardTitle}>Account requests</span>
                                    <span className={styles.pendingBadge}>{pendingRequests.length} pending</span>
                                </div>
                                <button className={styles.cardLink} onClick={() => navigate('/instructor/manage')}>
                                    View all
                                </button>
                            </div>
                            {pendingRequests.slice(0, 3).map(req => (
                                <div key={req.id} className={styles.reqItem}>
                                    <div className={styles.reqLeft}>
                                        <div className={styles.reqAvatar}>{getInitials(req.full_name)}</div>
                                        <div>
                                            <p className={styles.reqName}>{req.full_name}</p>
                                            <p className={styles.reqEmail}>{req.email}</p>
                                        </div>
                                    </div>
                                    <span className={styles.reqRole}>{req.role}</span>
                                    <div className={styles.reqActions}>
                                        <button
                                            className={styles.btnApprove}
                                            disabled={approvingId === req.id}
                                            onClick={() => handleApprove(req.id)}
                                        >
                                            {approvingId === req.id ? '...' : 'Approve'}
                                        </button>
                                        <button
                                            className={styles.btnReject}
                                            disabled={approvingId === req.id}
                                            onClick={() => handleReject(req.id)}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardTitle}>All projects progress</span>
                            <button className={styles.cardLink} onClick={() => navigate('/projects')}>
                                View all
                            </button>
                        </div>
                        <div className={styles.cardBody}>
                            <ProjectProgress projects={projects} />
                        </div>
                    </div>
                </div>

                <div>
                    <div className={styles.card} style={{ marginBottom: 16 }}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardTitle}>Task completion overview</span>
                        </div>
                        <div className={styles.chartWrap}>
                            <div className={styles.donutWrap}>
                                <canvas ref={chartRef} />
                                <div className={styles.donutCenter}>
                                    <span className={styles.donutPct}>{avgCompletion}%</span>
                                    <span className={styles.donutLabel}>completed</span>
                                </div>
                            </div>
                            <div className={styles.chartLegend}>
                                <div className={styles.legendRow}>
                                    <div className={styles.legendLeft}>
                                        <span className={styles.legendDot} style={{ background: '#9B6DE3' }} />
                                        <span>Done</span>
                                    </div>
                                    <span className={styles.legendVal}>{doneTasks} tasks</span>
                                </div>
                                <div className={styles.legendRow}>
                                    <div className={styles.legendLeft}>
                                        <span className={styles.legendDot} style={{ background: '#F59E0B' }} />
                                        <span>In progress</span>
                                    </div>
                                    <span className={styles.legendVal}>{inProgTasks} tasks</span>
                                </div>
                                <div className={styles.legendRow}>
                                    <div className={styles.legendLeft}>
                                        <span className={styles.legendDot} style={{ background: '#D8CDFF' }} />
                                        <span>Todo</span>
                                    </div>
                                    <span className={styles.legendVal}>{todoTasks} tasks</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardTitle}>Notifications</span>
                            <button className={styles.cardLink} onClick={readAll}>Mark all read</button>
                        </div>
                        <NotificationList
                            notifications={notifications.slice(0, 4)}
                            onRead={readNotification}
                            onReadAll={readAll}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Per-team member activity</span>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Team · Member</th>
                            <th>Todo</th>
                            <th>In progress</th>
                            <th>Done</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberActivity.map((m, i) => (
                            <tr key={`${m.id}-${i}`}>
                                <td>
                                    <div className={styles.memberCell}>
                                        <div className={styles.memberAv}>{getInitials(m.full_name)}</div>
                                        <span><strong className={styles.teamTag}>{m.team_name}</strong> · {m.full_name ?? 'Unknown'}</span>
                                    </div>
                                </td>
                                <td><span className={`${styles.pill} ${styles.pillTodo}`}>{m.todo}</span></td>
                                <td><span className={`${styles.pill} ${styles.pillProg}`}>{m.in_progress}</span></td>
                                <td><span className={`${styles.pill} ${styles.pillDone}`}>{m.done}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}