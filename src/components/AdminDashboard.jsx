// visitors/frontend/src/components/AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

// Get backend URL from environment variable
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

const AdminDashboard = () => {
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // New state for modal
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState('');

    useEffect(() => {
        const fetchVisitors = async () => {
            const adminApiKey = localStorage.getItem('adminApiKey');

            if (!adminApiKey) {
                navigate('/admin/login');
                return;
            }

            try {
                const response = await axios.get(`${BACKEND_API_URL}/admin/visitors`, { // Use environment variable
                    headers: {
                        'Admin-API-Key': adminApiKey
                    }
                });
                setVisitors(response.data.data);
            } catch (err) {
                console.error('Error fetching visitors:', err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setError('Authentication failed. Please log in again.');
                    localStorage.removeItem('adminApiKey');
                    navigate('/admin/login');
                } else {
                    setError('Failed to load visitor data. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchVisitors();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminApiKey');
        navigate('/admin/login');
    };

    // New functions for modal
    const openImageModal = (imageUrl) => {
        setModalImageUrl(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setModalImageUrl('');
        setShowImageModal(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <div className="text-center text-lg font-semibold text-gray-700">Loading visitor data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <div className="text-center text-red-600 font-semibold p-4 bg-red-100 rounded-md shadow">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-600 transition duration-300"
                    >
                        Logout
                    </button>
                </div>

                {visitors.length === 0 ? (
                    <p className="text-center text-gray-600 text-lg py-10">No visitor data available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visiting Card</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OTP Verified</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capture Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visitors.map((visitor) => (
                                    <tr key={visitor._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{visitor.mobileNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visitor.visitingCardImageUrl ? (
                                                <button
                                                    onClick={() => openImageModal(visitor.visitingCardImageUrl)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                                                >
                                                    View Image
                                                </button>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visitor.otpVerified ? 'Yes' : 'No'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{visitor.captureMethod}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visitor.createdAt ? format(new Date(visitor.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visitor.updatedAt ? format(new Date(visitor.updatedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {showImageModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
                    onClick={closeImageModal}
                >
                    <div
                        className="bg-white p-4 rounded-lg shadow-xl max-w-screen-lg max-h-[90vh] overflow-y-auto w-full relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeImageModal}
                            className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 text-3xl font-bold"
                        >
                            &times;
                        </button>
                        <img
                            src={modalImageUrl}
                            alt="Visiting Card"
                            className="max-w-full h-auto rounded-md mx-auto object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;