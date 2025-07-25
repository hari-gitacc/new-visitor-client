// visitors/frontend/src/components/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { 
    Edit, 
    Trash2, 
    X, 
    Check, 
    Download, 
    Search,
    Filter,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Users,
    Calendar,
    Phone,
    MapPin,
    Building2,
    CheckCircle,
    XCircle,
    MoreVertical
} from 'lucide-react';
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

        await onSave(editedData, setLocalError);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full relative my-8 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Edit Visitor Details</h2>

                {localError && (
                    <div className="p-4 mb-4 text-sm font-medium text-red-800 bg-red-50 rounded-lg border border-red-200">
                        {localError}
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label htmlFor="editName" className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                        <input
                            type="text"
                            id="editName"
                            name="name"
                            value={editedData.name || ''}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editPersonalPhone" className="block text-sm font-semibold text-gray-700 mb-2">Personal Phone Number</label>
                        <input
                            type="tel"
                            id="editPersonalPhone"
                            name="personalPhoneNumber"
                            value={editedData.personalPhoneNumber || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, personalPhoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            maxLength="10"
                            required
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editCompanyPhone" className="block text-sm font-semibold text-gray-700 mb-2">Company Phone Number (Optional)</label>
                        <input
                            type="tel"
                            id="editCompanyPhone"
                            name="companyPhoneNumber"
                            value={editedData.companyPhoneNumber || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, companyPhoneNumber: e.target.value.replace(/\D/g, '') }))}
                            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label htmlFor="editAddress" className="block text-sm font-semibold text-gray-700 mb-2">Address (Optional)</label>
                        <textarea
                            id="editAddress"
                            name="address"
                            value={editedData.address || ''}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full border border-gray-300 rounded-lg shadow-sm p-3 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={isSaving}
                        />
                        <label htmlFor="editOtpVerified" className="ml-3 block text-sm font-semibold text-gray-700">OTP Verified</label>
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
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

    // Enhanced state management
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [filterVerified, setFilterVerified] = useState('all');

    // Modal states
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState('');
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
                const sortedVisitors = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setVisitors(sortedVisitors);
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

    // Enhanced filtering and sorting
    const filteredAndSortedVisitors = React.useMemo(() => {
        let filtered = visitors;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(visitor =>
                visitor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                visitor.personalPhoneNumber?.includes(searchTerm) ||
                visitor.companyPhoneNumber?.includes(searchTerm) ||
                visitor.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                visitor.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Verification filter
        if (filterVerified !== 'all') {
            filtered = filtered.filter(visitor => 
                filterVerified === 'verified' ? visitor.otpVerified : !visitor.otpVerified
            );
        }

        // Sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [visitors, searchTerm, filterVerified, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleLogout = () => {
        localStorage.removeItem('adminApiKey');
        navigate('/admin/login');
    };

    const openImageModal = (imageUrl) => {
        setModalImageUrl(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setModalImageUrl('');
        setShowImageModal(false);
    };

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
                setError(null);
                if (filteredAndSortedVisitors.length - 1 <= (currentPage - 1) * itemsPerPage && currentPage > 1) {
                    setCurrentPage(prev => prev - 1);
                }
            } catch (err) {
                console.error('Error deleting visitor:', err);
                setError(err.response?.data?.message || 'Failed to delete visitor. Please try again.');
            }
        }
    };

    const handleOpenEditModal = (visitor) => {
        setCurrentVisitorToEdit(visitor);
        setShowEditModal(true);
        setError(null);
    };

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

            setVisitors(prevVisitors =>
                prevVisitors.map(v => (v._id === editedData._id ? response.data.data : v))
            );
            setShowEditModal(false);
            setCurrentVisitorToEdit(null);
            setError(null);
        } catch (err) {
            console.error('Error saving visitor from modal:', err);
            const errMsg = err.response?.data?.message || 'Failed to update visitor. Please try again.';
            setLocalError(errMsg);
            setError(errMsg);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setCurrentVisitorToEdit(null);
        setError(null);
    };

    const handleDownloadExcel = () => {
        const data = filteredAndSortedVisitors.map(visitor => ({
            'Name': visitor.name || '',
            'Company Name': visitor.companyName || '',
            'Personal Phone': visitor.personalPhoneNumber || '',
            'Company Phone': visitor.companyPhoneNumber || '',
            'Address': visitor.address || '',
            'OTP Verified': visitor.otpVerified ? 'Yes' : 'No',
            'Capture Method': visitor.captureMethod || '',
            'Created At': visitor.createdAt ? format(new Date(visitor.createdAt), 'dd-MM-yyyy HH:mm:ss') : '',
            'Updated At': visitor.updatedAt ? format(new Date(visitor.updatedAt), 'dd-MM-yyyy HH:mm:ss') : '',
            'Visiting Card URL': visitor.visitingCardImageUrl || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 20 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 60 },
            { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 60 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visitors");
        XLSX.writeFile(wb, `visitors-data-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVisitors = filteredAndSortedVisitors.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredAndSortedVisitors.length / itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pageNumbers.push(i);
        }
        return pageNumbers;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                    <div className="text-xl font-semibold text-white">Loading visitor data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
                <div className="text-center text-red-600 font-semibold p-6 bg-white rounded-xl shadow-lg border border-red-200">
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br w-full from-blue-50 via-white to-indigo-50">
            {/* Header Section - Fixed height */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                                <p className="text-sm text-gray-600 mt-1">Manage visitor information and data</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                                <span className="text-sm font-medium text-blue-800">Total Visitors: </span>
                                <span className="text-lg font-bold text-blue-600">{filteredAndSortedVisitors.length}</span>
                            </div>
                            
                            <button
                                onClick={handleDownloadExcel}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export Excel</span>
                            </button>
                            
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search visitors by name, phone, company, or address..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                        </div>
                        
                        <div className="flex space-x-3">
                            <select
                                value={filterVerified}
                                onChange={(e) => setFilterVerified(e.target.value)}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            >
                                <option value="all">All Visitors</option>
                                <option value="verified">Verified Only</option>
                                <option value="unverified">Unverified Only</option>
                            </select>
                            
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - 80vh for table */}
            <div className="">
                {filteredAndSortedVisitors.length === 0 ? (
                    <div className="text-center py-20 rounded-xl shadow-lg">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-xl text-gray-600 font-medium">No visitor data available</p>
                        <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <>
                        {/* Rich Table Container - 80vh */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200" >
                            <div className="overflow-auto h-full">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                S.No
                                            </th>
                                            <th 
                                                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 border-b border-gray-200"
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Name</span>
                                                    {sortConfig.key === 'name' && (
                                                        <div className={`transform transition-transform duration-200 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                                                            <ChevronLeft className="w-4 h-4 rotate-90" />
                                                        </div>
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 border-b border-gray-200"
                                                onClick={() => handleSort('companyName')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>Company</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                <div className="flex items-center space-x-1">
                                                    <Phone className="w-4 h-4" />
                                                    <span>Personal Phone</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                <div className="flex items-center space-x-1">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>Company Phone</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Address</span>
                                                </div>
                                            </th>
                                            {/* <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                Verification
                                            </th> */}
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                Method
                                            </th>
                                            <th 
                                                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 border-b border-gray-200"
                                                onClick={() => handleSort('createdAt')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Created</span>
                                                    {sortConfig.key === 'createdAt' && (
                                                        <div className={`transform transition-transform duration-200 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                                                            <ChevronLeft className="w-4 h-4 rotate-90" />
                                                        </div>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                Card
                                            </th>
                                            <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentVisitors.map((visitor, index) => (
                                            <tr key={visitor._id} className="hover:bg-blue-50/50 transition-all duration-200 group">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                        {indexOfFirstItem + index + 1}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                                                            {visitor.name?.charAt(0)?.toUpperCase() || 'N'}
                                                        </div>
                                                        <div>
                                                           <div className="text-sm font-medium text-gray-900">
                                                               {visitor.name || 'N/A'}
                                                           </div>
                                                       </div>
                                                   </div>
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   <div className="flex items-center">
                                                       <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                                                       {visitor.companyName || 'N/A'}
                                                   </div>
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   <div className="flex items-center">
                                                       <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                                       <span className="font-mono">{visitor.personalPhoneNumber || 'N/A'}</span>
                                                   </div>
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   <div className="flex items-center">
                                                       <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                                                       <span className="font-mono">{visitor.companyPhoneNumber || 'N/A'}</span>
                                                   </div>
                                               </td>
                                               <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                                                   <div className="flex items-start">
                                                       <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                                       <span className="truncate" title={visitor.address}>
                                                           {visitor.address || 'N/A'}
                                                       </span>
                                                   </div>
                                               </td>
                                               {/* <td className="px-4 py-4 whitespace-nowrap">
                                                   {visitor.otpVerified ? (
                                                       <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                           <CheckCircle className="w-3 h-3 mr-1" />
                                                           Verified
                                                       </span>
                                                   ) : (
                                                       <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                           <XCircle className="w-3 h-3 mr-1" />
                                                           Unverified
                                                       </span>
                                                   )}
                                               </td> */}
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                       {visitor.captureMethod || 'N/A'}
                                                   </span>
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   <div className="flex items-center">
                                                       <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                                       <div>
                                                           <div className="font-medium">
                                                               {visitor.createdAt ? format(new Date(visitor.createdAt), 'dd-MM-yyyy') : 'N/A'}
                                                           </div>
                                                           <div className="text-xs text-gray-500">
                                                               {visitor.createdAt ? format(new Date(visitor.createdAt), 'HH:mm:ss') : ''}
                                                           </div>
                                                       </div>
                                                   </div>
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                   {visitor.visitingCardImageUrl ? (
                                                       <button
                                                           onClick={() => openImageModal(visitor.visitingCardImageUrl)}
                                                           className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-all duration-200 border border-purple-200"
                                                       >
                                                           <Eye className="w-3 h-3 mr-1" />
                                                           View
                                                       </button>
                                                   ) : (
                                                       <span className="text-gray-400 text-xs">No Image</span>
                                                   )}
                                               </td>
                                               <td className="px-4 py-4 whitespace-nowrap text-center">
                                                   <div className="flex items-center justify-center space-x-2">
                                                       <button
                                                           onClick={() => handleOpenEditModal(visitor)}
                                                           className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group-hover:opacity-100 opacity-70"
                                                           title="Edit Visitor"
                                                           disabled={isSavingEdit}
                                                       >
                                                           <Edit className="w-4 h-4" />
                                                       </button>
                                                       <button
                                                           onClick={() => handleDeleteClick(visitor._id)}
                                                           className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:opacity-100 opacity-70"
                                                           title="Delete Visitor"
                                                           disabled={isSavingEdit}
                                                       >
                                                           <Trash2 className="w-4 h-4" />
                                                       </button>
                                                   </div>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                       </div>

                       {/* Enhanced Pagination Controls - 10vh */}
                       {totalPages > 1 && (
                           <div className=" bg-white rounded-xl shadow-lg border border-gray-200 p-4" >
                               <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                   <div className="text-sm text-gray-700">
                                       Showing <span className="font-medium text-gray-900">{indexOfFirstItem + 1}</span> to{' '}
                                       <span className="font-medium text-gray-900">
                                           {Math.min(indexOfLastItem, filteredAndSortedVisitors.length)}
                                       </span>{' '}
                                       of <span className="font-medium text-gray-900">{filteredAndSortedVisitors.length}</span> results
                                   </div>
                                   
                                   <div className="flex items-center space-x-2">
                                       {/* First Page */}
                                       <button
                                           onClick={() => paginate(1)}
                                           disabled={currentPage === 1}
                                           className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                           title="First Page"
                                       >
                                           <ChevronsLeft className="w-4 h-4" />
                                       </button>
                                       
                                       {/* Previous Page */}
                                       <button
                                           onClick={() => paginate(currentPage - 1)}
                                           disabled={currentPage === 1}
                                           className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                           title="Previous Page"
                                       >
                                           <ChevronLeft className="w-4 h-4" />
                                       </button>
                                       
                                       {/* Page Numbers */}
                                       <div className="flex space-x-1">
                                           {getPageNumbers().map(number => (
                                               <button
                                                   key={number}
                                                   onClick={() => paginate(number)}
                                                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                       currentPage === number
                                                           ? 'bg-blue-600 text-white shadow-md'
                                                           : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                   }`}
                                               >
                                                   {number}
                                               </button>
                                           ))}
                                       </div>
                                       
                                       {/* Next Page */}
                                       <button
                                           onClick={() => paginate(currentPage + 1)}
                                           disabled={currentPage === totalPages}
                                           className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                           title="Next Page"
                                       >
                                           <ChevronRight className="w-4 h-4" />
                                       </button>
                                       
                                       {/* Last Page */}
                                       <button
                                           onClick={() => paginate(totalPages)}
                                           disabled={currentPage === totalPages}
                                           className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                           title="Last Page"
                                       >
                                           <ChevronsRight className="w-4 h-4" />
                                       </button>
                                   </div>
                               </div>
                               
                               {/* Quick Jump */}
                               <div className="mt-4 flex items-center justify-center space-x-4">
                                   <span className="text-sm text-gray-600">Jump to page:</span>
                                   <input
                                       type="number"
                                       min="1"
                                       max={totalPages}
                                       value={currentPage}
                                       onChange={(e) => {
                                           const page = parseInt(e.target.value);
                                           if (page >= 1 && page <= totalPages) {
                                               paginate(page);
                                           }
                                       }}
                                       className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   />
                                   <span className="text-sm text-gray-600">of {totalPages}</span>
                               </div>
                           </div>
                       )}
                   </>
               )}
           </div>

           {/* Enhanced Image Modal */}
           {showImageModal && (
               <div
                   className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                   onClick={closeImageModal}
               >
                   <div
                       className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-auto w-full relative"
                       onClick={(e) => e.stopPropagation()}
                   >
                       <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                           <h3 className="text-lg font-semibold text-gray-900">Visiting Card</h3>
                           <button
                               onClick={closeImageModal}
                               className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                           >
                               <X className="w-5 h-5" />
                           </button>
                       </div>
                       <div className="p-6">
                           <img
                               src={modalImageUrl}
                               alt="Visiting Card"
                               className="max-w-full h-auto rounded-lg mx-auto shadow-lg"
                               style={{ maxHeight: '70vh' }}
                           />
                       </div>
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