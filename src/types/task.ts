export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    project_id: string;
    assigned_to: string | null;
    due_date: string | null;
    created_at: string;
}

export interface NewTask {
    title: string;
    description: string | null;
    status: TaskStatus;
    project_id: string;
    assigned_to: string | null;
    created_by: string;
    due_date: string | null;
}

export interface TaskFormValues {
    title: string;
    description: string | null;
    status: TaskStatus;
    assigned_to: string | null;
    due_date: string | null;
}

export interface Comment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

export interface NewComment {
    task_id: string;
    user_id: string;
    content: string;
}

// note guys:
// this is to link the task with the assignee name not only id
// so by this type you use it , after you retrive the name from the link with id 
export interface TaskWithAssignee extends Task {
    assignee: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
}

export interface EnrichedTask extends Task {
    assignee_name?: string | null;
    project_name?: string | null;
}