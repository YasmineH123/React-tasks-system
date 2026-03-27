import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RequestAccount from './pages/RequestAccount';
import Dashboard from './pages/Dashboard';
const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/login" replace />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPassword />,
    },
    {
        path: '/reset-password',
        element: <ResetPassword />,
    },
    {
        path: '/request-account',
        element: <RequestAccount />,
    },
    {
        path: '/register',
        element: <Navigate to="/login" replace />,
    },
    {
        path: '/dashboard',
        element: <ProtectedRoute><Dashboard/></ProtectedRoute> ,
    },
    {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
    },
]);

export default function Router() {
    return <RouterProvider router={router} />;
}