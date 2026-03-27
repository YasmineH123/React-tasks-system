import { useAuthContext } from '../context/AuthContext';
import StudentDashboard from '../components/dashboard/StudentDashboard';

export default function Dashboard() {
    const { user, loading } = useAuthContext();

    if (loading || !user) return null;

    if (user.role === 'student') return <StudentDashboard user={user} />;
    if (user.role === 'leader') return <div>Leader dashboard — coming soon</div>;
    return <div>Instructor dashboard — coming soon</div>;
}