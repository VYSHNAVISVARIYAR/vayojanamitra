import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isProfileComplete) {
    // Redirect to profile setup if profile is incomplete
    return <Navigate to="/profile/setup" replace />;
  }

  return children;
};

export default ProtectedRoute;
