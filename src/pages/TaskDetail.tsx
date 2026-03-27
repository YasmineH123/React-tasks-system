import { Link, useParams } from 'react-router-dom';

export default function TaskDetail() {
  const { id } = useParams();

  return (
    <div style={{ padding: '24px' }}>
      <h1>Task Detail</h1>
      <p>Task ID from URL: {id}</p>

      <p style={{ marginTop: '16px' }}>
        This page is scaffolded. Next step: fetch task, comments, and add status update logic.
      </p>

      <div style={{ marginTop: '20px' }}>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    </div>
  );
}