import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Spinner } from '../ui/Spinner';

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <Spinner fullScreen />;
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
