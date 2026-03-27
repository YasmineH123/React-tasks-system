import type { Task } from '../types/task';

export function isOverdue(task: Task): boolean {
    if (!task.due_date || task.status === 'done') return false;
    return new Date(task.due_date) < new Date();
}

export function getTasksDueThisWeek(tasks: Task[]): Task[] {
    const now = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(now.getDate() + 7);
    return tasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        const d = new Date(t.due_date);
        return d >= now && d <= weekEnd;
    });
}

export function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}