import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from '../../styles/ProjectProgress.module.css';

interface ProjectWithTasks {
    id: string;
    name: string;
    tasks: { id: string; status: string }[];
}

interface Props {
    projects: ProjectWithTasks[];
}

function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#9B6DE3', '#E56ACF', '#6C3EB6', '#3ED598', '#F59E0B'];

export default function ProjectProgress({ projects }: Props) {
    const navigate = useNavigate();

    if (projects.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No projects yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.list}>
            {projects.map(project => {
                const total = project.tasks.length;
                const done = project.tasks.filter(t => t.status === 'done').length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const initials = getInitials(project.name);

                return (
                    <div
                        key={project.id}
                        className={styles.card}
                        onClick={() => navigate(`/projects/${project.id}`)}
                    >
                        <div className={styles.top}>
                            <div className={styles.nameRow}>
                                <div className={styles.projectIcon}>{initials}</div>
                                <span className={styles.name}>{project.name}</span>
                            </div>
                            <div className={styles.right}>
                                <span className={styles.pct}>{pct}%</span>
                                <ArrowRight size={14} color="var(--color-text-secondary)" />
                            </div>
                        </div>
                        <div className={styles.bar}>
                            <div className={styles.fill} style={{ width: `${pct}%` }} />
                        </div>
                        <div className={styles.meta}>
                            <span className={styles.metaText}>{done} / {total} tasks done</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}