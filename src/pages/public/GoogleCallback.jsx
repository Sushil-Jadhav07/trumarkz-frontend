import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const GoogleCallback = () => {
  const location = useLocation();
  return <Navigate to={`/auth/callback${location.search || ''}`} replace />;
};

export default GoogleCallback;
