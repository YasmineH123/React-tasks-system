import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RequestAccount from './pages/RequestAccount';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import TeamManagement from './pages/TeamManagement';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';

const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/dashboard" replace /> },
    { path: '/login', element: <Login /> },
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/reset-password', element: <ResetPassword /> },
    { path: '/request-account', element: <RequestAccount /> },

    {
        element: (
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
        ),
        children: [
            { path: '/dashboard', element: <Dashboard /> },
            { path: '/projects', element: <div style={{ padding: 32 }}>Projects — coming soon</div> },
            { path: '/projects/:id', element: <ProjectDetail /> },
            { path: '/tasks/:id', element: <TaskDetail /> },
            { path: '/board', element: <Board /> },
            { path: '/teams', element: <TeamManagement /> },
            { path: '/profile', element: <div style={{ padding: 32 }}>Profile — coming soon</div> },
        ],
    },

    { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function Router() {
    return <RouterProvider router={router} />;
}