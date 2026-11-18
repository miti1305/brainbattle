// Wrap a page so only logged-in users (optionally with certain roles) can open it.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container py-5 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <div className="container py-5"><div className="alert alert-danger">You do not have access to this page.</div></div>;
  }
  return children;
}
