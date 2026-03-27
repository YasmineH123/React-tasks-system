import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../../types/task';
import styles from '../../styles/DeadlineCalendar.module.css';

interface Props { tasks: Task[]; }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function DeadlineCalendar({ tasks }: Props) {
  const navigate   = useNavigate();
  const today      = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDaySun = new Date(year, month, 1).getDay();

  const tasksByDay: Record<number, Task[]> = {};
  tasks.forEach(task => {
    if (!task.due_date) return;
    const d = new Date(task.due_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  });

  function taskCountForMonth(m: number): number {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === year && d.getMonth() === m;
    }).length;
  }

  function prevYear() { setYear(y => y - 1); }
  function nextYear() { setYear(y => y + 1); }

  function handleDayClick(day: number) {
    const dayTasks = tasksByDay[day];
    if (dayTasks?.length === 1) navigate(`/tasks/${dayTasks[0].id}`);
  }

  const cells: (number | null)[] = [
    ...Array(firstDaySun).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={styles.wrap}>

      <div className={styles.sidebar}>
        <div className={styles.yearRow}>
          <button className={styles.yearBtn} onClick={prevYear}><ChevronLeft size={13} /></button>
          <span className={styles.year}>{year}</span>
          <button className={styles.yearBtn} onClick={nextYear}><ChevronRight size={13} /></button>
        </div>
        <div className={styles.monthList}>
          {MONTHS.map((m, i) => {
            const count    = taskCountForMonth(i);
            const isActive = i === month;
            return (
              <button
                key={m}
                className={`${styles.monthItem} ${isActive ? styles.monthActive : ''}`}
                onClick={() => setMonth(i)}
              >
                <span className={styles.monthName}>{m}</span>
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
          <span className={styles.calMonth}>{MONTHS[month].toUpperCase()}</span>
        </div>

        <div className={styles.grid}>
          {DAY_LABELS.map(d => (
            <div key={d} className={styles.dayLabel}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;

            const isToday    = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayTasks   = tasksByDay[day] ?? [];
            const hasTask    = dayTasks.length > 0;
            const hasOverdue = dayTasks.some(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done');

            return (
              <div
                key={day}
                className={[
                  styles.cell,
                  isToday             ? styles.today    : '',
                  hasOverdue          ? styles.deadline : '',
                  hasTask && !hasOverdue && !isToday ? styles.hasTask : '',
                  hasTask             ? styles.clickable : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => hasTask && setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {day}
                {hoveredDay === day && dayTasks.length > 0 && (
                  <div className={styles.tooltip}>
                    {dayTasks.map(t => (
                      <div key={t.id} className={styles.tooltipItem}>
                        <span
                          className={styles.tooltipDot}
                          style={{ background: t.status === 'done' ? '#3ED598' : hasOverdue ? '#E53E3E' : '#9B6DE3' }}
                        />
                        {t.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#D8CDFF' }} />Has task</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#FBCFE8' }} />Deadline</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#9B6DE3' }} />Today</div>
        </div>
      </div>

    </div>
  );
}