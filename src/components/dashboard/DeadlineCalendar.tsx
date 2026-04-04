import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EnrichedTask } from '../../types/task';
import styles from '../../styles/DeadlineCalendar.module.css';

interface Props { tasks: EnrichedTask[]; }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DeadlineCalendar({ tasks }: Props) {
    const navigate = useNavigate();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [tooltip, setTooltip] = useState<{ day: number } | null>(null);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDaySun = new Date(year, month, 1).getDay();

    const tasksByDay: Record<number, EnrichedTask[]> = {};
    tasks.forEach(task => {
        if (!task.due_date) return;
        const d = new Date(task.due_date);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            if (!tasksByDay[day]) tasksByDay[day] = [];
            tasksByDay[day].push(task);
        }
    });

    function taskCountForMonth(m: number) {
        return tasks.filter(t => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d.getFullYear() === year && d.getMonth() === m;
        }).length;
    }

    function handleDayClick(day: number) {
        const dayTasks = tasksByDay[day];
        if (!dayTasks?.length) return;
        if (dayTasks.length === 1) navigate(`/tasks/${dayTasks[0].id}`);
        else navigate('/board');
    }

    const cells: (number | null)[] = [
        ...Array(firstDaySun).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const tooltipTasks = tooltip ? (tasksByDay[tooltip.day] ?? []) : [];

    return (
        <div className={styles.wrap}>

            <div className={styles.sidebar}>
                <div className={styles.yearRow}>
                    <button className={styles.yearBtn} onClick={() => setYear(y => y - 1)}>
                        <ChevronLeft size={12} />
                    </button>
                    <span className={styles.year}>{year}</span>
                    <button className={styles.yearBtn} onClick={() => setYear(y => y + 1)}>
                        <ChevronRight size={12} />
                    </button>
                </div>
                <div className={styles.monthList}>
                    {MONTHS.map((m, i) => {
                        const count = taskCountForMonth(i);
                        const isActive = i === month;
                        return (
                            <button
                                key={m}
                                className={`${styles.monthItem} ${isActive ? styles.monthActive : ''}`}
                                onClick={() => setMonth(i)}
                            >
                                <span className={styles.monthName}>{m.slice(0, 3)}</span>
                                {count > 0 && (
                                    <span className={`${styles.monthCount} ${isActive ? styles.monthCountActive : ''}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={styles.main}>
                <div className={styles.calHeader}>
                    <span className={styles.calMonth}>{MONTHS[month]} {year}</span>
                    <div className={styles.navBtns}>
                        <button className={styles.yearBtn} onClick={() => {
                            if (month === 0) { setMonth(11); setYear(y => y - 1); }
                            else setMonth(m => m - 1);
                        }}>
                            <ChevronLeft size={14} />
                        </button>
                        <button className={styles.yearBtn} onClick={() => {
                            if (month === 11) { setMonth(0); setYear(y => y + 1); }
                            else setMonth(m => m + 1);
                        }}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                <div className={styles.grid}>
                    {DAY_LABELS.map(d => (
                        <div key={d} className={styles.dayLabel}>{d}</div>
                    ))}

                    {cells.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} className={styles.emptyCell} />;

                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        const dayTasks = tasksByDay[day] ?? [];
                        const hasTask = dayTasks.length > 0;
                        const hasOverdue = dayTasks.some(t =>
                            t.due_date && new Date(t.due_date) < today && t.status !== 'done'
                        );
                        const allDone = hasTask && dayTasks.every(t => t.status === 'done');

                        return (
                            <div
                                key={day}
                                className={`${styles.cell} ${hasTask ? styles.clickable : ''}`}
                                onClick={() => handleDayClick(day)}
                                onMouseEnter={() => hasTask && setTooltip({ day })}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <div className={`${styles.dayNum} ${isToday ? styles.todayNum : ''}`}>
                                    {day}
                                </div>
                                {hasTask && (
                                    <div className={styles.dots}>
                                        <span
                                            className={styles.dot}
                                            style={{
                                                background: allDone
                                                    ? '#3ED598'
                                                    : hasOverdue
                                                        ? '#E53E3E'
                                                        : '#9B6DE3',
                                            }}
                                        />
                                        {dayTasks.length > 1 && (
                                            <span className={styles.dotCount}>{dayTasks.length}</span>
                                        )}
                                    </div>
                                )}
                                {tooltip?.day === day && (
                                    <div className={styles.tooltip}>
                                        {dayTasks.map(t => {
                                            const overdue = t.due_date && new Date(t.due_date) < today && t.status !== 'done';
                                            return (
                                                <div key={t.id} className={styles.tooltipItem}>
                                                    <span
                                                        className={styles.tooltipDot}
                                                        style={{
                                                            background: t.status === 'done'
                                                                ? '#3ED598'
                                                                : overdue ? '#E53E3E' : '#9B6DE3',
                                                        }}
                                                    />
                                                    <div className={styles.tooltipContent}>
                                                        <span className={styles.tooltipTitle}>{t.title}</span>
                                                        {(t.assignee_name || t.project_name) && (
                                                            <span className={styles.tooltipMeta}>
                                                                {[t.assignee_name, t.project_name].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#9B6DE3' }} />
                        Has task
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#E53E3E' }} />
                        Overdue
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#3ED598' }} />
                        Done
                    </div>
                </div>
            </div>
        </div>
    );
}