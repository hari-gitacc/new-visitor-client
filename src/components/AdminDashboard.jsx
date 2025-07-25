// visitors/frontend/src/components/AdminDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Edit, Trash2, X, Check, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// Get backend URL from environment variable
const BACKEND_API_URL = 'https://new-visitor-backend.onrender.com/api';

// Helper component for the Edit Modal
const EditVisitorModal = ({ visitor, onClose, onSave, isSaving }) => {
    const [editedData, setEditedData] = useState(visitor);
    const [localError, setLocalError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditedData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setLocalError(null);
        // Basic validation matching backend
        if (!editedData.personalPhoneNumber || !/^[6-9]\d{9}$/.test(editedData.personalPhoneNumber)) {
            setLocalError('Personal Mobile Number is required and must be 10 digits starting with 6-9.');
            return;
        }
        if (editedData.companyPhoneNumber && !/^[0-9]{10,15}$/.test(editedData.companyPhoneNumber)) {
            setLocalError('Company Phone Number must be 10-15 digits.');
            return;
        }

        await onSave(editedData, setLocalError); // Pass setLocalError for parent to update on API error
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative my-8" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                    title="Close"
                >
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Visitor Details</h2>

                {localError && (
                    <div className="p-3 mb-4 text-sm font-medium text-red-800 bg-red-100 rounded-lg border border-red-200">
                        {localError}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label htmlFor="editName" className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            id="editName"
                            name="name"
                            value={editedData.name || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editPersonalPhone" className="block text-sm font-medium text-gray-700">Personal Phone Number</label>
                        <input
                            type="tel"
                            id="editPersonalPhone"
                            name="personalPhoneNumber"
                            value={editedData.personalPhoneNumber || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, personalPhoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                            maxLength="10"
                            required
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editCompanyPhone" className="block text-sm font-medium text-gray-700">Company Phone Number (Optional)</label>
                        <input
                            type="tel"
                            id="editCompanyPhone"
                            name="companyPhoneNumber"
                            value={editedData.companyPhoneNumber || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, companyPhoneNumber: e.target.value.replace(/\D/g, '') }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editAddress" className="block text-sm font-medium text-gray-700">Address (Optional)</label>
                        <textarea
                            id="editAddress"
                            name="address"
                            value={editedData.address || ''}
                            onChange={handleInputChange}
                            rows="3"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm resize-y"
                            disabled={isSaving}
                        ></textarea>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="editOtpVerified"
                            name="otpVerified"
                            checked={editedData.otpVerified || false}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={isSaving}
                        />
                        <label htmlFor="editOtpVerified" className="ml-2 block text-sm font-medium text-gray-700">OTP Verified</label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminDashboard = () => {
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // States for image modal
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState('');

    // States for edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentVisitorToEdit, setCurrentVisitorToEdit] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        const fetchVisitors = async () => {
            const adminApiKey = localStorage.getItem('adminApiKey');

            if (!adminApiKey) {
                navigate('/admin/login');
                return;
            }

            try {
                const response = await axios.get(`https://new-visitor-backend.onrender.com/api/admin/visitors`, {
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

    // Functions for image modal
    const openImageModal = (imageUrl) => {
        setModalImageUrl(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setModalImageUrl('');
        setShowImageModal(false);
    };

    // Handle Delete button click
    const handleDeleteClick = async (visitorId) => {
        if (window.confirm("Are you sure you want to delete this visitor? This action cannot be undone.")) {
            try {
                const adminApiKey = localStorage.getItem('adminApiKey');
                await axios.delete(`https://new-visitor-backend.onrender.com/api/admin/visitors/${visitorId}`, {
                    headers: {
                        'Admin-API-Key': adminApiKey
                    }
                });
                setVisitors(prevVisitors => prevVisitors.filter(visitor => visitor._id !== visitorId));
                setError(null); // Clear any previous errors
            } catch (err) {
                console.error('Error deleting visitor:', err);
                setError(err.response?.data?.message || 'Failed to delete visitor. Please try again.');
            }
        }
    };

    // Handle Edit button click (opens modal)
    const handleOpenEditModal = (visitor) => {
        setCurrentVisitorToEdit(visitor);
        setShowEditModal(true);
        setError(null); // Clear any previous errors
    };

    // Handle Save from modal
    const handleSaveFromModal = async (editedData, setLocalError) => {
        setIsSavingEdit(true);
        try {
            const adminApiKey = localStorage.getItem('adminApiKey');
            const response = await axios.put(
                `https://new-visitor-backend.onrender.com/api/admin/visitors/${editedData._id}`,
                editedData,
                {
                    headers: {
                        'Admin-API-Key': adminApiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('Update successful:', response.data);

            setVisitors(prevVisitors =>
                prevVisitors.map(v => (v._id === editedData._id ? response.data.data : v))
            );
            setShowEditModal(false); // Close modal
            setCurrentVisitorToEdit(null); // Clear editing state
            setError(null); // Clear any previous errors
        } catch (err) {
            console.error('Error saving visitor from modal:', err);
            const errMsg = err.response?.data?.message || 'Failed to update visitor. Please try again.';
            setLocalError(errMsg); // Set error in modal
            setError(errMsg); // Set error in main dashboard (optional, depends on UX)
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Handle Close from modal
    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setCurrentVisitorToEdit(null);
        setError(null); // Clear any errors
    };

    // Handle Download Excel
    const handleDownloadExcel = () => {
        const data = visitors.map(visitor => ({
            'Name': visitor.name || '',
            'Personal Phone': visitor.personalPhoneNumber || '',
            'Company Phone': visitor.companyPhoneNumber || '',
            'Address': visitor.address || '',
            'OTP Verified': visitor.otpVerified ? 'Yes' : 'No',
            'Capture Method': visitor.captureMethod || '',
            'Created At': visitor.createdAt ? format(new Date(visitor.createdAt), 'dd-MM-yyyy') : '',
            'Updated At': visitor.updatedAt ? format(new Date(visitor.updatedAt), 'dd-MM-yyyy') : '',
            'Visiting Card URL': visitor.visitingCardImageUrl || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        ws['!cols'] = [
            { wch: 15 }, // Name
            { wch: 18 }, // Personal Phone
            { wch: 18 }, // Company Phone
            { wch: 30 }, // Address
            { wch: 15 }, // OTP Verified
            { wch: 15 }, // Capture Method
            { wch: 15 }, // Created At
            { wch: 15 }, // Updated At
            { wch: 60 }  // Visiting Card URL
        ];


        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visitors");
        XLSX.writeFile(wb, "admin-data.xlsx");
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

    console.log('Visitors data:', visitors); // Debugging line to check fetched data
    

    return (
        <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
            <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-800 text-center sm:text-left">Admin Dashboard</h1>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                        <button
                            onClick={handleDownloadExcel}
                            className="w-full sm:w-auto flex items-center justify-center bg-green-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700 transition duration-300 shadow-md"
                        >
                            <Download className="w-5 h-5 mr-2" /> Download Excel
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full sm:w-auto bg-red-500 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-600 transition duration-300 shadow-md"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                

                {visitors.length === 0 ? (
                    <p className="text-center text-gray-600 text-lg py-10">No visitor data available.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full bg-white divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] md:px-6">Company Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] md:px-6">Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] md:px-6">Personal Phone</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] md:px-6">Company Phone</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] md:px-6">Address</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] md:px-6">OTP Verified</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] md:px-6">Capture Method</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] md:px-6">Created At</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] md:px-6">Updated At</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] md:px-6">Visiting Card</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] md:px-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visitors.map((visitor) => (
                                    <tr key={visitor._id} className="hover:bg-gray-50">
                                         <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 md:px-6">{visitor.companyName || 'N/A'}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 md:px-6">{visitor.name || 'N/A'}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 md:px-6">{visitor.personalPhoneNumber || 'N/A'}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">{visitor.companyPhoneNumber || 'N/A'}</td>
                                        <td className="px-3 py-4 whitespace-pre-wrap text-sm text-gray-500 md:px-6">{visitor.address || 'N/A'}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">
                                            {visitor.otpVerified ? 'Yes' : 'No'}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">{visitor.captureMethod}</td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">
                                            {visitor.createdAt ? format(new Date(visitor.createdAt), 'dd-MM-yyyy hh:mm:ss a') : 'N/A'} {/* CHANGED: Date and time format */}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">
                                            {visitor.updatedAt ? format(new Date(visitor.updatedAt), 'dd-MM-yyyy hh:mm:ss a') : 'N/A'} {/* CHANGED: Date and time format */}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:px-6">
                                            {visitor.visitingCardImageUrl ? (
                                                <button
                                                    onClick={() => openImageModal(visitor.visitingCardImageUrl)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                                                >
                                                    View
                                                </button>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium md:px-6">
                                            <div className="flex space-x-2 items-center">
                                                <button
                                                    onClick={() => handleOpenEditModal(visitor)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Visitor"
                                                    disabled={isSavingEdit}
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(visitor._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Visitor"
                                                    disabled={isSavingEdit}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Image Modal (Remains the same) */}
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

            {/* Edit Visitor Modal */}
            {showEditModal && currentVisitorToEdit && (
                <EditVisitorModal
                    visitor={currentVisitorToEdit}
                    onClose={handleCloseEditModal}
                    onSave={handleSaveFromModal}
                    isSaving={isSavingEdit}
                />
            )}
        </div>
    );
};

export default AdminDashboard;