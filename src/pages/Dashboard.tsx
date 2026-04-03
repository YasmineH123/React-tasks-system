import { useAuthContext } from '../context/AuthContext';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import LeaderDashboard from '../components/dashboard/LeaderDashboard';
import InstructorDashboard from '../components/dashboard/InstructorDashboard';

export default function Dashboard() {
    const { user, isLeaderOfAny, loading } = useAuthContext();
    if (loading || !user) return null;

    if (user.role === 'instructor') return <InstructorDashboard user={user} />;
    if (isLeaderOfAny) return <LeaderDashboard user={user} />;
    return <StudentDashboard user={user} />;
}