'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { 
  Trash2, Mail, Phone, Calendar, MessageSquare, CheckCircle, 
  Clock, XCircle, Image as ImageIcon, Search, Filter, Download,
  DollarSign, Cake, ChevronDown, ChevronUp, Eye, MapPin, Users,
  Layers, AlertCircle, Edit, Send, Loader2, Package, MessageCircle,
  ArrowRight, Bell, Copy, Check, ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CustomRequest {
  id: string;
  userId: string;
  userName?: string;
  name: string;
  phone: string;
  email?: string;
  userEmail?: string;
  deliveryAddress?: string;
  
  occasion: string;
  flavor: string;
  size: string;
  servings?: string;
  tier?: string;
  eggless?: boolean;
  
  design: string;
  budget: string;
  deliveryDate: string;
  urgency?: string;
  message?: string;
  
  referenceImages?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  
  adminNotes?: string;
  quotedPrice?: number;
  
  createdAt: any;
  updatedAt?: any;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  { value: 'completed', label: 'Completed', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
];

export default function CustomRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();

  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{
    show: boolean;
    requestId: string;
    newStatus: string;
    message: string;
  }>({ show: false, requestId: '', newStatus: '', message: '' });

  const fetchRequests = useCallback(async () => {
    try {
      const q = query(collection(db, 'customRequests'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || Date.now()),
      } as CustomRequest));
      
      setRequests(requestsData);
      setFilteredRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showError('❌ Failed to load custom requests');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Filter requests
  useEffect(() => {
    let result = [...requests];

    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(request =>
        request.name?.toLowerCase().includes(search) ||
        request.phone?.includes(search) ||
        request.occasion?.toLowerCase().includes(search) ||
        request.flavor?.toLowerCase().includes(search) ||
        request.id?.toLowerCase().includes(search)
      );
    }

    setFilteredRequests(result);
  }, [requests, statusFilter, searchTerm]);

  // Generate WhatsApp status message
  const generateStatusMessage = (request: CustomRequest, newStatus: string) => {
    let statusEmoji = '';
    let statusText = '';
    
    switch (newStatus) {
      case 'processing':
        statusEmoji = '🔄';
        statusText = `Your custom ${request.occasion} cake request is now being processed!`;
        break;
      case 'approved':
        statusEmoji = '✅';
        statusText = `Great news! Your custom ${request.occasion} cake request has been approved!`;
        break;
      case 'completed':
        statusEmoji = '🎉';
        statusText = `Your custom ${request.occasion} cake is ready for delivery!`;
        break;
      case 'rejected':
        statusEmoji = '❌';
        statusText = `We're sorry, but we cannot fulfill your custom ${request.occasion} cake request at this time.`;
        break;
      default:
        statusEmoji = '📋';
        statusText = `Update on your custom ${request.occasion} cake request.`;
    }

    const message = 
      `Hello ${request.name},\n\n` +
      `${statusEmoji} ${statusText}\n\n` +
      `REQUEST DETAILS:\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `Request ID: #${request.id.slice(0, 8)}\n` +
      `Occasion: ${request.occasion}\n` +
      `Flavor: ${request.flavor}\n` +
      `Size: ${request.size}\n` +
      `Budget: ₹${request.budget}\n` +
      (request.quotedPrice ? `Quoted Price: ₹${request.quotedPrice}\n` : '') +
      `Delivery Date: ${new Date(request.deliveryDate).toLocaleDateString('en-IN')}\n\n` +
      (request.adminNotes ? `Notes: ${request.adminNotes}\n\n` : '') +
      `Thank you for choosing NestSweet Bakers!\n\n` +
      `For any queries, feel free to contact us.`;
    
    return message;
  };

  // Create in-app notification
  const createNotification = async (request: CustomRequest, newStatus: string, oldStatus: string) => {
    if (!request.userId || oldStatus === newStatus) return;

    try {
      let title = '';
      let body = '';
      let type: 'info' | 'success' | 'warning' = 'info';

      switch (newStatus) {
        case 'processing':
          title = 'Request Being Reviewed';
          body = `Your custom ${request.occasion} cake request is now being processed.`;
          type = 'info';
          break;
        case 'approved':
          title = 'Request Approved!';
          body = `Your custom ${request.occasion} cake request has been approved${request.quotedPrice ? ` at ₹${request.quotedPrice}` : ''}.`;
          type = 'success';
          break;
        case 'completed':
          title = 'Cake Ready!';
          body = `Your custom ${request.occasion} cake is ready for delivery!`;
          type = 'success';
          break;
        case 'rejected':
          title = 'Request Update';
          body = `Your custom ${request.occasion} cake request status has been updated.`;
          type = 'warning';
          break;
        default:
          title = 'Request Update';
          body = `Your custom ${request.occasion} cake request status has been updated to ${newStatus}.`;
          type = 'info';
      }

      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        requestId: request.id,
        title,
        body,
        type,
        read: false,
        createdAt: serverTimestamp(),
        actionUrl: `/orders`,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Update status
  const updateStatus = async (id: string, newStatus: string, skipWhatsApp = false, customMessage?: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    // Show WhatsApp modal if not skipping
    if (!skipWhatsApp && !customMessage && request.phone && newStatus !== request.status) {
      const defaultMessage = generateStatusMessage(request, newStatus);
      setWhatsappModal({
        show: true,
        requestId: id,
        newStatus,
        message: defaultMessage
      });
      return;
    }

    setUpdating(id);
    try {
      const oldStatus = request.status;

      await updateDoc(doc(db, 'customRequests', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setRequests(requests.map(r =>
        r.id === id ? { ...r, status: newStatus as any } : r
      ));

      // Create in-app notification
      await createNotification(request, newStatus, oldStatus);

      showSuccess(`✅ Request status updated to ${newStatus}`);

      // Open WhatsApp if custom message provided
      if (customMessage && request.phone) {
        const whatsappUrl = `https://wa.me/${request.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customMessage)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('❌ Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  // Handle WhatsApp send
  const handleSendWhatsApp = () => {
    if (whatsappModal.requestId && whatsappModal.newStatus) {
      updateStatus(whatsappModal.requestId, whatsappModal.newStatus, true, whatsappModal.message);
      setWhatsappModal({ show: false, requestId: '', newStatus: '', message: '' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'customRequests', id));
      setRequests(requests.filter(r => r.id !== id));
      showSuccess('✅ Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      showError('❌ Failed to delete request');
    }
  };

  const convertToOrder = async (request: CustomRequest) => {
    if (!confirm('Convert this custom request to an order?')) return;

    try {
      const orderData = {
        orderRef: 'CUSTOM-' + Date.now().toString(36).toUpperCase(),
        userId: request.userId,
        userName: request.userName || request.name,
        userEmail: request.userEmail || request.email,
        userPhone: request.phone,
        
        items: [{
          cakeId: 'custom',
          cakeName: `Custom ${request.occasion} Cake`,
          cakeImage: request.referenceImages?.[0] || '',
          quantity: parseFloat(request.size) || 1,
          weight: request.size,
          basePrice: request.quotedPrice || parseFloat(request.budget),
          totalPrice: request.quotedPrice || parseFloat(request.budget),
          customization: request.design,
          category: 'Custom',
          flavor: request.flavor,
        }],
        
        customerInfo: {
          name: request.name,
          phone: request.phone,
          email: request.email,
          address: request.deliveryAddress || '',
          pincode: '',
        },
        
        deliveryDate: request.deliveryDate,
        deliveryTime: 'morning',
        deliveryAddress: request.deliveryAddress || '',
        
        isGift: false,
        occasionType: request.occasion,
        
        specialInstructions: request.message,
        
        subtotal: request.quotedPrice || parseFloat(request.budget),
        deliveryFee: 0,
        packagingFee: 0,
        tax: 0,
        discount: 0,
        total: request.quotedPrice || parseFloat(request.budget),
        
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        
        status: 'pending',
        orderStatus: 'pending',
        trackingSteps: {
          placed: true,
          confirmed: false,
          preparing: false,
          outForDelivery: false,
          delivered: false,
        },
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'custom_request',
        customRequestId: request.id,
      };

      await addDoc(collection(db, 'orders'), orderData);
      await updateStatus(request.id, 'approved', true);
      
      showSuccess('✅ Converted to order successfully!');
    } catch (error) {
      console.error('Error converting to order:', error);
      showError('❌ Failed to convert to order');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Request ID', 'Date', 'Name', 'Phone', 'Email', 'Address',
      'Occasion', 'Flavor', 'Size', 'Servings', 'Tiers', 'Eggless',
      'Budget', 'Delivery Date', 'Urgency', 'Status', 
      'Admin Notes', 'Quoted Price'
    ];
    
    const rows = filteredRequests.map(request => [
      request.id,
      request.createdAt?.toLocaleDateString('en-IN') || '',
      request.name,
      request.phone,
      request.email || '',
      request.deliveryAddress || '',
      request.occasion,
      request.flavor,
      request.size,
      request.servings || '',
      request.tier || '',
      request.eggless ? 'Yes' : 'No',
      request.budget,
      request.deliveryDate,
      request.urgency || 'normal',
      request.status,
      request.adminNotes || '',
      request.quotedPrice || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
      
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom_requests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showSuccess('✅ Requests exported successfully');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const StatusIcon = STATUS_OPTIONS.find(s => s.value === status)?.icon || Clock;
    return <StatusIcon size={16} />;
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    processing: requests.filter(r => r.status === 'processing').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">Loading custom requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* WhatsApp Message Modal */}
      {whatsappModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Send WhatsApp Update</h3>
                  <p className="text-sm text-gray-600">Request #{whatsappModal.requestId.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModal({ show: false, requestId: '', newStatus: '', message: '' })}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Bell className="inline mr-2" size={16} />
                Status will be updated to <strong className="uppercase">{whatsappModal.newStatus}</strong> and customer will receive this message on WhatsApp.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message to Customer
              </label>
              <textarea
                value={whatsappModal.message}
                onChange={(e) => setWhatsappModal({ ...whatsappModal, message: e.target.value })}
                rows={12}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Edit message before sending..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  updateStatus(whatsappModal.requestId, whatsappModal.newStatus, true);
                  setWhatsappModal({ show: false, requestId: '', newStatus: '', message: '' });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Skip WhatsApp, Just Update
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Send & Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Custom Cake Requests
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Cake size={16} />
            Manage customer custom cake designs
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-4 border-2 border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-4 border-2 border-yellow-200">
          <p className="text-yellow-700 text-sm font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-4 border-2 border-blue-200">
          <p className="text-blue-700 text-sm font-medium">Processing</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{stats.processing}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-4 border-2 border-green-200">
          <p className="text-green-700 text-sm font-medium">Approved</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-4 border-2 border-purple-200">
          <p className="text-purple-700 text-sm font-medium">Completed</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-4 border-2 border-red-200">
          <p className="text-red-700 text-sm font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, occasion, flavor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all appearance-none bg-white"
            >
              <option value="all">All Status ({requests.length})</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label} ({requests.filter(r => r.status === status.value).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Cake className="mx-auto mb-4 text-gray-300" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No custom requests found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
              {/* Request Header */}
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-xl text-gray-800">{request.occasion} Cake</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                      {request.eggless && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border-2 border-green-200">
                          🥚 Eggless
                        </span>
                      )}
                      {request.urgency === 'urgent' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border-2 border-red-200">
                          🔴 Urgent
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(request.id)}
                          className="flex items-center gap-1 hover:text-pink-600 transition"
                        >
                          <Cake size={14} className="flex-shrink-0" />
                          #{request.id.slice(0, 8)}
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="flex items-center gap-2">
                        <Calendar size={14} className="flex-shrink-0" />
                        {request.createdAt?.toLocaleDateString('en-IN')}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone size={14} className="flex-shrink-0" />
                        {request.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Users size={14} className="flex-shrink-0" />
                        {request.servings || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="text-2xl font-bold text-pink-600">₹{request.budget}</p>
                      {request.quotedPrice && (
                        <p className="text-sm text-green-600 font-semibold">
                          Quoted: ₹{request.quotedPrice}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/custom-requests/${request.id}`}
                        className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                        title="View Full Details"
                      >
                        <ExternalLink size={20} />
                      </Link>
                      
                      <button
                        onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {expandedRequest === request.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Preview */}
              {expandedRequest === request.id && (
                <div className="p-4 md:p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Customer Info */}
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                        <Users size={16} className="text-pink-600" />
                        Customer
                      </h4>
                      <p className="text-sm"><strong>{request.name}</strong></p>
                      <p className="text-sm text-gray-600">{request.phone}</p>
                      {request.email && <p className="text-xs text-gray-500">{request.email}</p>}
                    </div>

                    {/* Cake Details */}
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                        <Cake size={16} className="text-pink-600" />
                        Details
                      </h4>
                      <p className="text-sm"><strong>Flavor:</strong> {request.flavor}</p>
                      <p className="text-sm"><strong>Size:</strong> {request.size}</p>
                      <p className="text-sm"><strong>Tiers:</strong> {request.tier || '1'}</p>
                    </div>

                    {/* Delivery */}
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar size={16} className="text-pink-600" />
                        Delivery
                      </h4>
                      <p className="text-sm">
                        {new Date(request.deliveryDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      {request.deliveryAddress && (
                        <p className="text-xs text-gray-600 mt-1">{request.deliveryAddress.slice(0, 50)}...</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/custom-requests/${request.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Full Details
                    </Link>

                    <select
                      value={request.status}
                      onChange={(e) => updateStatus(request.id, e.target.value)}
                      disabled={updating === request.id}
                      className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:opacity-50 font-semibold"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>

                    {request.phone && (
                      <>
                        <a
                          href={`tel:${request.phone}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
                        >
                          <Phone size={16} />
                          Call
                        </a>

                        <a
                          href={`https://wa.me/${request.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => convertToOrder(request)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold flex items-center gap-2"
                    >
                      <Package size={16} />
                      Convert to Order
                    </button>

                    <button
                      onClick={() => handleDelete(request.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
            <button
              onClick={() => setViewImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-800 p-3 rounded-full hover:bg-gray-200 transition-colors z-10 shadow-lg"
            >
              <XCircle size={28} />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={viewImage}
                alt="Full size reference"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
