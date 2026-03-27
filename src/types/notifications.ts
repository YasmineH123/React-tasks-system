export type NotificationType = 'new_task' | 'new_comment' | 'task_update';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
}