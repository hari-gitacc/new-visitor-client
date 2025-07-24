// visitors/frontend/src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const adminApiKey = localStorage.getItem('adminApiKey');

  if (!adminApiKey) {
    // If no API key, redirect to the admin login page
    return <Navigate to="/admin/login" replace />;
  }

  // If authenticated, render the children components (e.g., AdminDashboard)
  return children;
};

export default ProtectedRoute;