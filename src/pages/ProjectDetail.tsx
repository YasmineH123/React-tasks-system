import { Link, useParams } from 'react-router-dom';

export default function ProjectDetail() {
  const { id } = useParams();

  return (
    <div style={{ padding: '24px' }}>
      <h1>Project Detail</h1>
      <p>Project ID from URL: {id}</p>

      <p style={{ marginTop: '16px' }}>
        This page is scaffolded. Next step: fetch project, tasks, members, and progress.
      </p>

      <div style={{ marginTop: '20px' }}>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    </div>
  );
}