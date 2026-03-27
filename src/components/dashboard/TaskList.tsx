import { useNavigate } from 'react-router-dom';
import type { Task, TaskStatus } from '../../types/task';
import { isOverdue } from '../../utils/taskUtils';
import styles from '../../styles/TaskList.module.css';
import { AlertCircle, Clock } from 'lucide-react';

interface Props { tasks: Task[]; }

const statusConfig: Record<TaskStatus, {
    label: string;
    pillBg: string;
    pillColor: string;
    cardBg: string;
    dotBg: string;
    dotBorder: string;
}> = {
    todo: {
        label: 'To do',
        pillBg: 'rgba(108,62,182,0.1)',
        pillColor: '#6C3EB6',
        cardBg: '#F5F3FF',
        dotBg: '#fff',
        dotBorder: '#9B6DE3',
    },
    in_progress: {
        label: 'In progress',
        pillBg: 'rgba(245,158,11,0.1)',
        pillColor: '#92400E',
        cardBg: '#FFFBEB',
        dotBg: '#F59E0B',
        dotBorder: '#F59E0B',
    },
    done: {
        label: 'Done',
        pillBg: 'rgba(62,213,152,0.12)',
        pillColor: '#1a7a52',
        cardBg: '#F0FDF9',
        dotBg: '#3ED598',
        dotBorder: '#3ED598',
    },
};

export default function TaskList({ tasks }: Props) {
    const navigate = useNavigate();

    if (tasks.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No tasks assigned yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.timeline}>
            {tasks.map((task, i) => {
                const overdue = isOverdue(task);
                const cfg = statusConfig[task.status];
                const isLast = i === tasks.length - 1;

                return (
                    <div key={task.id} className={styles.row}>
                        <div className={styles.bulletCol}>
                            <div
                                className={styles.dot}
                                style={{ background: cfg.dotBg, borderColor: cfg.dotBorder }}
                            />
                            {!isLast && <div className={styles.line} />}
                        </div>

                        <div
                            className={`${styles.card} ${overdue ? styles.cardOverdue : ''}`}
                            style={{ background: overdue ? '#FEF2F2' : cfg.cardBg }}
                            onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                            <div className={styles.cardLeft}>
                                <span className={styles.taskTitle}>{task.title}</span>
                                {task.due_date && (
                                    <span className={`${styles.due} ${overdue ? styles.dueRed : ''}`}>
                                        {overdue
                                            ? <AlertCircle size={10} />
                                            : <Clock size={10} />
                                        }
                                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            <div className={styles.cardRight}>
                                <span
                                    className={styles.pill}
                                    style={{
                                        background: overdue ? 'rgba(229,62,62,0.1)' : cfg.pillBg,
                                        color: overdue ? '#C53030' : cfg.pillColor
                                    }}
                                >
                                    {overdue ? 'Overdue' : cfg.label}
                                </span>
                                <div className={styles.arrow}>›</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}