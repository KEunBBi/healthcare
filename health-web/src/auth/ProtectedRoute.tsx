import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext';

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div role="status">로딩 중...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
