import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading, profileError } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        Loading your account...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileError || !profile) {
    return (
      <div className="page-center">
        {profileError || 'Profile not found.'}
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}