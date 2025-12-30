'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trash2, Mail, Phone, Calendar, MessageSquare, CheckCircle, Clock, XCircle, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function CustomRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const requestsSnap = await getDocs(collection(db, 'customRequests'));
      const requestsData = requestsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      requestsData.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'customRequests', id), { status });
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      await deleteDoc(doc(db, 'customRequests', id));
      setRequests(requests.filter(r => r.id !== id));
      alert('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Custom Cake Requests</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage customer custom cake orders</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'processing', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base capitalize ${
                filter === status
                  ? 'bg-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status} ({requests.filter(r => status === 'all' || r.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
          <p className="text-gray-500 text-sm sm:text-lg">No requests found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-800">{request.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status || 'pending')}`}>
                        {getStatusIcon(request.status || 'pending')}
                        {request.status || 'pending'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2 flex-wrap">
                        <Mail size={16} className="flex-shrink-0" />
                        <span className="break-all">{request.email}</span>
                      </p>
                      {request.phone && (
                        <p className="flex items-center gap-2">
                          <Phone size={16} className="flex-shrink-0" />
                          {request.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <Calendar size={16} className="flex-shrink-0" />
                        {request.createdAt.toLocaleDateString()} {request.createdAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex sm:flex-col gap-2">
                    <select
                      value={request.status || 'pending'}
                      onChange={(e) => updateStatus(request.id, e.target.value)}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm font-medium"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cake Type</label>
                      <p className="text-gray-800 font-medium">{request.cakeType || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Flavor</label>
                      <p className="text-gray-800 font-medium">{request.flavor || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Size/Weight</label>
                      <p className="text-gray-800 font-medium">{request.size || 'Not specified'}</p>
                    </div>
                    {request.deliveryDate && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Delivery Date</label>
                        <p className="text-gray-800 font-medium">{new Date(request.deliveryDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {request.budget && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Budget</label>
                        <p className="text-gray-800 font-medium">₹{request.budget}</p>
                      </div>
                    )}
                  </div>

                  {/* Message & Image */}
                  <div className="space-y-3">
                    {request.message && (
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-2">
                          <MessageSquare size={14} />
                          Special Instructions
                        </label>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm break-words whitespace-pre-wrap">
                          {request.message}
                        </p>
                      </div>
                    )}

                    {/* Show uploaded image if exists */}
                    {request.imageUrl && (
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-2">
                          <ImageIcon size={14} />
                          Reference Image
                        </label>
                        <div className="relative w-full h-48 sm:h-64 bg-gray-200 rounded-lg overflow-hidden">
                          <Image
                            src={request.imageUrl}
                            alt="Customer reference"
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <a
                          href={request.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                        >
                          <ImageIcon size={14} />
                          View Full Image
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
