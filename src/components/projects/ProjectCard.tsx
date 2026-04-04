import { useNavigate } from 'react-router-dom';
import type { ProjectWithTasks, ViewMode } from '../../hooks/useProjectsPage';
import { PROJECT_COLORS, getInitials } from '../../hooks/useProjectsPage';
import styles from '../../styles/Projects.module.css';

interface Props {
    project: ProjectWithTasks;
    viewMode: ViewMode;
    isSelected: boolean;
    onSelect: (id: string) => void;
    isInstructor: boolean;
}

export default function ProjectCard({ project: p, viewMode, isSelected, onSelect, isInstructor }: Props) {
    const navigate = useNavigate();
    const color = PROJECT_COLORS[p.colorIdx % PROJECT_COLORS.length];
    const done = p.tasks.filter(t => t.status === 'done').length;
    const total = p.tasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const initials = getInitials(p.name);

    function handleClick() {
        if (isInstructor) {
            onSelect(p.id);
        } else {
            navigate(`/projects/${p.id}`);
        }
    }

    function MemberAvatars() {
        return (
            <div className={styles.pcAvs}>
                {p.members.slice(0, 3).map((m, mi) => (
                    <div
                        key={m.id}
                        className={styles.pcAv}
                        style={{ background: color, marginLeft: mi > 0 ? -6 : 0 }}
                    >
                        {getInitials(m.full_name ?? '?')}
                    </div>
                ))}
            </div>
        );
    }

    function ProgressBar() {
        return (
            <div className={styles.pcBar}>
                <div className={styles.pcFill} style={{ width: `${pct}%`, background: color }} />
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div
                className={`${styles.pc} ${styles.pcListRow} ${isSelected ? styles.pcSelected : ''}`}
                onClick={handleClick}
            >
                <div className={styles.pcListIcon} style={{ background: color }}>{initials}</div>
                <div className={styles.pcListInfo}>
                    <div className={styles.pcName}>{p.name}</div>
                    <div className={styles.pcTeam}>{p.team_name}</div>
                </div>
                <div className={styles.pcListBar}><ProgressBar /></div>
                <div className={styles.pcPct} style={{ color: 'var(--color-primary)' }}>{pct}%</div>
                <div className={styles.pcCount}>{done}/{total} done</div>
                <MemberAvatars />
            </div>
        );
    }

    if (viewMode === 'detailed') {
        return (
            <div
                className={`${styles.pc} ${isSelected ? styles.pcSelected : ''}`}
                onClick={handleClick}
            >
                <div className={styles.pcDetailedHeader}>
                    <div className={styles.pcDetailedIcon} style={{ background: color }}>{initials}</div>
                    <div>
                        <div className={styles.pcName}>{p.name}</div>
                        <div className={styles.pcTeam}>{p.team_name}</div>
                    </div>
                </div>
                <div className={styles.pcDetailedStats}>
                    {[
                        { label: 'Progress', val: `${pct}%` },
                        { label: 'Tasks done', val: `${done} / ${total}` },
                        { label: 'Members', val: String(p.members.length) },
                    ].map(item => (
                        <div key={item.label} className={styles.pcStatBox}>
                            <div className={styles.pcStatLabel}>{item.label}</div>
                            <div className={styles.pcStatVal}>{item.val}</div>
                        </div>
                    ))}
                </div>
                <ProgressBar />
            </div>
        );
    }

    return (
        <div
            className={`${styles.pc} ${isSelected ? styles.pcSelected : ''}`}
            onClick={handleClick}
        >
            <div className={styles.pcBanner} style={{ background: color }}>
                <div className={styles.pcBannerCircle} />
                <div className={styles.pcBannerCircle2} />
                <span className={styles.pcInitials}>{initials}</span>
            </div>
            <div className={styles.pcBody}>
                <div className={styles.pcName}>{p.name}</div>
                <div className={styles.pcTeam}>{p.team_name}</div>
                <ProgressBar />
                <div className={styles.pcFoot}>
                    <div>
                        <div className={styles.pcPct} style={{ color: 'var(--color-primary)' }}>{pct}%</div>
                        <div className={styles.pcCount}>{done}/{total} done</div>
                    </div>
                    <MemberAvatars />
                </div>
            </div>
        </div>
    );
}