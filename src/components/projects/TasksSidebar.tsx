import { useNavigate } from 'react-router-dom';
import type { MyTask, TaskFilter } from '../../hooks/useProjectsPage';
import { TAG_CONFIG, GROUP_ORDER, GROUP_LABELS } from '../../hooks/useProjectsPage';
import styles from '../../styles/Projects.module.css';

interface Props {
    groupedTasks: Record<string, MyTask[]>;
    totalCount: number;
    taskFilter: TaskFilter;
    onTaskFilter: (f: TaskFilter) => void;
}

export default function TasksSidebar({ groupedTasks, totalCount, taskFilter, onTaskFilter }: Props) {
    const navigate = useNavigate();

    return (
        <div className={styles.rightPanel}>
            <div className={styles.rph}>
                <span className={styles.sectionTitle}>My tasks</span>
            </div>
            <div className={styles.taskPanel}>
                <div className={styles.tpTop}>
                    <div className={styles.tpTitle}>My tasks</div>
                    <select
                        value={taskFilter}
                        onChange={e => onTaskFilter(e.target.value as TaskFilter)}
                        className={styles.filterDropdown}
                    >
                        <option value="all">All tasks</option>
                        <option value="overdue">Overdue</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="next7">Next 7 days</option>
                        <option value="next30">Next 30 days</option>
                    </select>
                </div>

                <div className={styles.tl}>
                    {totalCount === 0 && (
                        <div className={styles.tlEmpty}>
                            <p>No tasks to show.</p>
                        </div>
                    )}

                    {GROUP_ORDER.map(group => {
                        const tasks = groupedTasks[group] ?? [];
                        if (!tasks.length) return null;
                        const cfg = TAG_CONFIG[group];

                        return (
                            <div key={group}>
                                <div className={styles.slbl}>{GROUP_LABELS[group]}</div>
                                {tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={styles.taskCard}
                                        style={{ borderLeftColor: cfg.border }}
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                    >
                                        <div className={styles.tcTop}>
                                            <div className={styles.tcTitle}>{task.title}</div>
                                            <span
                                                className={styles.tcBadge}
                                                style={{ background: cfg.bg, color: cfg.color }}
                                            >
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className={styles.tcMeta}>
                                            <div className={styles.tcProject}>{task.project_name}</div>
                                            {task.due_date && (
                                                <div
                                                    className={styles.tcDue}
                                                    style={{ color: group === 'overdue' ? '#E53E3E' : 'var(--color-text-secondary)', fontWeight: group === 'overdue' ? 600 : 400 }}
                                                >
                                                    Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}