// visitors/frontend/src/App.jsx

import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import VisitorForm from './components/VisitorForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const location = useLocation();

  // MODIFIED: Hide Admin Login button ONLY if the current path starts with /admin
  // This means it will always show on the homepage (paths not starting with /admin)
  const hideAdminLoginButton = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md absolute top-4 right-[-20px] sm:top-6 sm:right-6">
        {!hideAdminLoginButton && (
          <Link to="/admin/login">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-[12px] text-white font-bold py-1 px-2 rounded-full shadow-lg transition duration-200">
              Admin Login
            </button>
          </Link>
        )}
      </div>

      <Routes>
        <Route path="/" element={<VisitorForm />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;