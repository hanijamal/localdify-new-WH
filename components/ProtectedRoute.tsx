import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './ui/Spinner';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-background">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Now, perform the trial check with the user data from the context.
  const isAdmin = user.role === 'admin';
  if (isAdmin) {
    return children; // Admins are exempt.
  }

  const isTrialing = user.subscriptionStatus === 'trialing';
  let isTrialExpired = false;
  if (user.trialEndsAt) {
    const trialEndDay = new Date(user.trialEndsAt);
    const expiryDate = new Date(Date.UTC(
      trialEndDay.getUTCFullYear(),
      trialEndDay.getUTCMonth(),
      trialEndDay.getUTCDate() + 1
    ));
    isTrialExpired = new Date() >= expiryDate;
  }
  
  if ((isTrialing && isTrialExpired) || user.subscriptionStatus === 'inactive') {
    return <Navigate to="/trial-ended" replace />;
  }

  return children;
};

export default ProtectedRoute;
