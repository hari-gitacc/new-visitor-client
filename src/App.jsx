// visitors/frontend/src/App.jsx

// Remove BrowserRouter as Router from here
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import VisitorForm from './components/VisitorForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

// ProtectedRoute component to guard admin dashboard
const ProtectedRoute = ({ children }) => {
    const adminApiKey = localStorage.getItem('adminApiKey');
    if (!adminApiKey) {
        return <Navigate to="/admin/login" replace />;
    }
    return children;
};

function App() {
    const location = useLocation(); // This call will now be within the Router context
    const isAdminLoginPage = location.pathname === '/admin/login';

    return (
        // Remove <Router> and </Router> tags here
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4 relative">
            {/* Admin Login Button - Conditionally rendered */}
            {!isAdminLoginPage && (
                <Link
                    to="/admin/login"
                    className="absolute top-4 right-4 bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-800 transition duration-300 shadow-lg"
                >
                    Admin Login
                </Link>
            )}

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
                {/* Add a fallback for any unmatched routes, perhaps redirect to home or a 404 page */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;