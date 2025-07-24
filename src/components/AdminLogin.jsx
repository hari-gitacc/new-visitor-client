// visitors/frontend/src/components/AdminLogin.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

// Get backend URL from environment variable
const BACKEND_API_URL = 'https://new-visitor-backend.onrender.com';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await axios.post(`https://new-visitor-backend.onrender.com/admin/login`, {
                username,
                password,
            });

            const { adminApiKey } = response.data;
            localStorage.setItem('adminApiKey', adminApiKey); // Back to storing adminApiKey
            setMessage({ type: 'success', text: 'Login successful! Redirecting...' });

            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Login failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm mx-auto my-10 border border-gray-200">
            <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-8">Admin Login</h1>
            {message.text && (
                <div className={`p-3 rounded-lg mb-4 text-center text-sm font-medium ${
                    message.type === 'success'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <div className="relative mt-1">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out pr-10"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-700 text-white py-3 px-4 rounded-lg font-bold hover:bg-indigo-800 disabled:bg-indigo-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            {/* Back to Home Button */}
            <div className="mt-6 text-center">
                <Link
                    to="/"
                    className="inline-flex items-center justify-center text-gray-700 hover:text-gray-900 text-sm font-medium py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-100 transition duration-200 ease-in-out shadow-sm"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default AdminLogin;