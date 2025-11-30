import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
