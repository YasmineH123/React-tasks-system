import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import styles from '../styles/TaskDetail.module.css';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

type TaskDetailRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  project_id: string;
  assigned_to: string | null;
  projects: {
    id: string;
    name: string;
  }[] | null;
};

type UserLite = {
  id: string;
  full_name: string | null;
  email: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type CommentView = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  authorName: string;
};

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export default function TaskDetail() {
  const { id } = useParams();
  const hasValidId = Boolean(id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [task, setTask] = useState<TaskDetailRow | null>(null);
  const [assigneeName, setAssigneeName] = useState('Unassigned');

  const [comments, setComments] = useState<CommentView[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;

    async function loadTaskPage() {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          project_id,
          assigned_to,
          projects ( id, name )
        `)
        .eq('id', id)
        .single();

      if (taskError || !taskData) {
        if (!cancelled) {
          setErrorMsg('Task not found. It may have been deleted or link is invalid.');
          setLoading(false);
        }
        return;
      }

      const typedTask = taskData as unknown as TaskDetailRow;

      let assignee = 'Unassigned';
      if (typedTask.assigned_to) {
        const { data: assigneeData, error: assigneeError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', typedTask.assigned_to)
          .maybeSingle();

        if (assigneeError) {
          if (!cancelled) {
            setErrorMsg('Failed to load assignee details.');
            setLoading(false);
          }
          return;
        }

        if (assigneeData) {
          const assigneeUser = assigneeData as UserLite;
          assignee = assigneeUser.full_name ?? assigneeUser.email;
        }
      }

      const { data: commentRows, error: commentsError } = await supabase
        .from('comments')
        .select('id, task_id, user_id, content, created_at')
        .eq('task_id', typedTask.id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        if (!cancelled) {
          setErrorMsg('Failed to load comments.');
          setLoading(false);
        }
        return;
      }

      const rawComments = (commentRows ?? []) as CommentRow[];
      const authorIds = Array.from(new Set(rawComments.map((c) => c.user_id)));

      let authorNameById = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', authorIds);

        if (usersError) {
          if (!cancelled) {
            setErrorMsg('Failed to load comment author names.');
            setLoading(false);
          }
          return;
        }

        const users = (usersData ?? []) as UserLite[];
        authorNameById = new Map(
          users.map((u) => [u.id, u.full_name ?? u.email])
        );
      }

      const commentViews: CommentView[] = rawComments.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        authorName: authorNameById.get(c.user_id) ?? 'Unknown user',
      }));

      if (!cancelled) {
        setTask(typedTask);
        setAssigneeName(assignee);
        setComments(commentViews);
        setLoading(false);
      }
    }

    void loadTaskPage();

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user, navigate]);

  const canUpdateStatus = useMemo(() => {
    if (!user || !task) return false;
    return user.role === 'leader' || task.assigned_to === user.id;
  }, [user, task]);

  if (!hasValidId) {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Task Detail</h2>
        <p className="form-error">Task id is missing from URL.</p>
        <Link to="/dashboard" className="link">Go back</Link>
      </div>
    );
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task || !canUpdateStatus) return;

    setErrorMsg('');
    setSuccessMsg('');

    const previousStatus = task.status;

    setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      setTask((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      setErrorMsg('Failed to update status. Please try again.');
      return;
    }

    setSuccessMsg('Status updated successfully.');
  }

  async function reloadComments(taskId: string) {
    const { data: commentRows, error: commentsError } = await supabase
      .from('comments')
      .select('id, task_id, user_id, content, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      setErrorMsg('Failed to refresh comments.');
      return;
    }

    const rawComments = (commentRows ?? []) as CommentRow[];
    const authorIds = Array.from(new Set(rawComments.map((c) => c.user_id)));

    let authorNameById = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', authorIds);

      if (usersError) {
        setErrorMsg('Failed to load author names while refreshing comments.');
        return;
      }

      const users = (usersData ?? []) as UserLite[];
      authorNameById = new Map(
        users.map((u) => [u.id, u.full_name ?? u.email])
      );
    }

    const commentViews: CommentView[] = rawComments.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      authorName: authorNameById.get(c.user_id) ?? 'Unknown user',
    }));

    setComments(commentViews);
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();

    if (!task || !user) return;

    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError('Comment cannot be empty or whitespace only.');
      return;
    }

    setCommentError('');
    setCommentSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.from('comments').insert({
      task_id: task.id,
      user_id: user.id,
      content: trimmed,
    });

    if (error) {
      setCommentSubmitting(false);
      setErrorMsg('Failed to add comment. Please try again.');
      return;
    }

    await reloadComments(task.id);
    setCommentInput('');
    setCommentSubmitting(false);
    setSuccessMsg('Comment added successfully.');
  }

  async function handleDeleteTask() {
    if (!task || !user || user.role !== 'leader') return;

    const ok = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!ok) return;

    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (error) {
      setErrorMsg('Failed to delete task. Please try again.');
      return;
    }

    navigate(`/projects/${task.project_id}`, { replace: true });
  }

  if (loading || authLoading) {
    return <div className={styles.loading}>Loading task...</div>;
  }

  if (errorMsg && !task) {
    return (
      <div className={styles.page}>
        <h2 className={styles.pageTitle}>Task Detail</h2>
        <p className="form-error">{errorMsg}</p>
        <Link to="/dashboard" className="link">Go back</Link>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.pageTitle}>{task.title}</h1>

        <p className={styles.helperText}>
          Project: {task.projects?.[0]?.name ?? 'Unknown project'}
        </p>

        <div className={styles.section}>
          <strong className={styles.sectionTitle}>Description</strong>
          <p className={styles.bodyText}>{task.description ?? 'No description provided.'}</p>
        </div>

        <div className={styles.metaGrid}>
          <div>
            <strong className={styles.sectionTitle}>Assignee:</strong>{' '}
            <span className={styles.bodyText}>{assigneeName}</span>
          </div>

          <div>
            <label htmlFor="statusSelect" className={`${styles.sectionTitle} form-label`}>Status:</label>
            <select
              id="statusSelect"
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              disabled={!canUpdateStatus}
              className={`form-input ${styles.statusSelect}`}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {!canUpdateStatus && (
              <p className={styles.helperText}>
                Only the assignee or a leader can update status.
              </p>
            )}
          </div>
        </div>

        {user?.role === 'leader' && (
          <div className={styles.actionRow}>
            <Link to={`/tasks/${task.id}/edit`} className="btn btn-secondary">Edit Task</Link>
            <button
              type="button"
              onClick={handleDeleteTask}
              className="btn btn-ghost"
            >
              Delete Task
            </button>
          </div>
        )}

        {errorMsg && <p className="form-error">{errorMsg}</p>}
        {successMsg && <p className="form-success">{successMsg}</p>}

        <hr className={styles.divider} />

        <h2 className={styles.sectionTitle}>Comments</h2>

        <div className={styles.commentsWrap}>
          {comments.length === 0 && (
            <p className={styles.helperText}>No comments yet.</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className={styles.commentCard}>
              <div className={styles.commentMeta}>
                <strong>{c.authorName}</strong> • {new Date(c.created_at).toLocaleString()}
              </div>
              <div className={styles.bodyText}>{c.content}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className={styles.formWrap}>
          <label htmlFor="commentInput" className="form-label">Add Comment</label>
          <textarea
            id="commentInput"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            rows={4}
            className="form-input"
            placeholder="Write your comment..."
          />
          {commentError && <p className="form-error">{commentError}</p>}
          <button
            type="submit"
            disabled={commentSubmitting}
            className="btn btn-primary"
          >
            {commentSubmitting ? 'Submitting...' : 'Submit Comment'}
          </button>
        </form>

        <div className={styles.footerNav}>
          <Link to={`/projects/${task.project_id}`} className="link">Back to Project</Link>
        </div>
      </div>
    </div>
  );
}