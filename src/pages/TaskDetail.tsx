import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthContext } from '../context/AuthContext';

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
    if (!id) {
      setErrorMsg('Task id is missing from URL.');
      setLoading(false);
      return;
    }

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

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task || !canUpdateStatus) return;

    setErrorMsg('');
    setSuccessMsg('');

    const previousStatus = task.status;

    // optimistic UI update
    setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      // rollback on failure
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
    return <div style={{ padding: '24px' }}>Loading task...</div>;
  }

  if (errorMsg && !task) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>Task Detail</h2>
        <p style={{ color: '#b91c1c' }}>{errorMsg}</p>
        <Link to="/dashboard">Go back</Link>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '920px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>{task.title}</h1>

      <p style={{ marginTop: 0, color: '#4b5563' }}>
        Project: {task.projects?.[0]?.name ?? 'Unknown project'}
      </p>

      <div style={{ marginTop: '14px', marginBottom: '14px' }}>
        <strong>Description</strong>
        <p style={{ marginTop: '6px' }}>{task.description ?? 'No description provided.'}</p>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
        <div>
          <strong>Assignee:</strong> {assigneeName}
        </div>

        <div>
          <label htmlFor="statusSelect"><strong>Status:</strong> </label>
          <select
            id="statusSelect"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            disabled={!canUpdateStatus}
            style={{ marginLeft: '8px' }}
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {!canUpdateStatus && (
            <p style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
              Only the assignee or a leader can update status.
            </p>
          )}
        </div>
      </div>

      {user?.role === 'leader' && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
          <Link to={`/tasks/${task.id}/edit`}>Edit Task</Link>
          <button
            type="button"
            onClick={handleDeleteTask}
            style={{
              border: 'none',
              background: '#b91c1c',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Delete Task
          </button>
        </div>
      )}

      {errorMsg && <p style={{ color: '#b91c1c' }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: '#047857' }}>{successMsg}</p>}

      <hr style={{ margin: '20px 0' }} />

      <h2 style={{ marginBottom: '10px' }}>Comments</h2>

      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
        {comments.length === 0 && (
          <p style={{ color: '#6b7280' }}>No comments yet.</p>
        )}

        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px',
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
              <strong>{c.authorName}</strong> • {new Date(c.created_at).toLocaleString()}
            </div>
            <div>{c.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddComment}>
        <label htmlFor="commentInput"><strong>Add Comment</strong></label>
        <textarea
          id="commentInput"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: '8px', marginBottom: '8px' }}
          placeholder="Write your comment..."
        />
        {commentError && <p style={{ color: '#b91c1c', marginTop: 0 }}>{commentError}</p>}
        <button
          type="submit"
          disabled={commentSubmitting}
          style={{
            border: 'none',
            background: '#2563eb',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {commentSubmitting ? 'Submitting...' : 'Submit Comment'}
        </button>
      </form>

      <div style={{ marginTop: '20px' }}>
        <Link to={`/projects/${task.project_id}`}>Back to Project</Link>
      </div>
    </div>
  );
}