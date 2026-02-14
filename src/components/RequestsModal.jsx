
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import coupleService from '../services/coupleService';
import { Button, Card, Spinner } from './ui';
import { useNavigate } from 'react-router-dom';

const RequestsModal = () => {
    // Check auth context. Note: if checkAuth is not exposed in AuthContext, we might need to handle refreshes via window.location.reload() or manually re-fetch data.
    const { user } = useAuth(); 
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState(null); 
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user]);

    const fetchRequests = async () => {
        try {
            const data = await coupleService.getRequests();
            // Assuming data is an array of request objects
            if (Array.isArray(data) && data.length > 0) {
                setRequests(data);
                setIsOpen(true);
            } else {
                setRequests([]);
                setIsOpen(false);
            }
        } catch (err) {
            console.error("Failed to fetch requests", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId) => {
        setAcceptingId(requestId);
        try {
            await coupleService.acceptRequest(requestId);
            // After accepting, we reload to refresh the entire app state (e.g. Profile, Dashboard checks for couple status)
            // A hard reload is simplest to ensure all contexts (Auth, Couple) are synced.
            window.location.reload(); 
        } catch (err) {
            console.error("Failed to accept request", err);
            // Extract error message safely
            const msg = err.response?.data?.error || err.message || "Failed to accept request";
            alert(msg);
            setAcceptingId(null);
        }
    };

    if (!isOpen || requests.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-rose-100 bg-rose-50/50">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">💌</span>
                        <h2 className="text-xl font-semibold text-rose-600">Partner Request!</h2>
                    </div>
                    <p className="mt-2 text-gray-600 text-sm">
                        Someone wants to be your partner in Couple's Paradise! 💕
                    </p>
                </div>
                
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {requests.map((req) => (
                        <div key={req._id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-rose-400 to-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                                    {req.user1?.first_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {req.user1?.first_name} {req.user1?.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{req.user1?.email}</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                onClick={() => handleAccept(req._id)}
                                loading={acceptingId === req._id}
                                className="bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transform active:scale-95 transition-all"
                            >
                                Accept
                            </Button>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RequestsModal;
