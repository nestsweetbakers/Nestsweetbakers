'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { 
  Trash2, Mail, Phone, Calendar, MessageSquare, CheckCircle, 
  Clock, XCircle, Image as ImageIcon, Search, Filter, Download,
  DollarSign, Cake, ChevronDown, ChevronUp, Eye, MapPin, Users,
  Layers, AlertCircle, Edit, Send, Loader2, Package, MessageCircle
} from 'lucide-react';
import Image from 'next/image';

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
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { showSuccess, showError } = useToast();

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

  // ✅ Generate WhatsApp message for status update
  const generateStatusMessage = (request: CustomRequest, newStatus: string) => {
    let statusMessage = '';
    
    switch (newStatus) {
      case 'processing':
        statusMessage = `🔄 Your custom ${request.occasion} cake request is now being processed!\n\n` +
                       `We're reviewing your design requirements and will get back to you shortly.`;
        break;
      case 'approved':
        statusMessage = `✅ Great news! Your custom ${request.occasion} cake request has been approved!\n\n` +
                       `💰 Quoted Price: ₹${request.quotedPrice || request.budget}\n` +
                       `📅 Delivery Date: ${new Date(request.deliveryDate).toLocaleDateString('en-IN')}\n\n` +
                       (request.adminNotes ? `📝 Notes: ${request.adminNotes}\n\n` : '') +
                       `We'll contact you soon to confirm the order.`;
        break;
      case 'rejected':
        statusMessage = `❌ We're sorry, but we cannot fulfill your custom ${request.occasion} cake request at this time.\n\n` +
                       (request.adminNotes ? `Reason: ${request.adminNotes}\n\n` : '') +
                       `Please feel free to contact us for alternative designs or requirements.`;
        break;
      case 'completed':
        statusMessage = `🎉 Your custom ${request.occasion} cake is ready for delivery!\n\n` +
                       `Thank you for choosing NestSweet Bakers. We hope you love your cake! 🍰`;
        break;
      default:
        statusMessage = `📋 Update on your custom ${request.occasion} cake request.\n\n` +
                       `Status: ${newStatus}\n\n` +
                       `We'll keep you updated on any progress.`;
    }

    const message = encodeURIComponent(
      `Hello ${request.name},\n\n${statusMessage}\n\n` +
      `Request ID: #${request.id.slice(0, 8)}\n\n` +
      `For any queries, feel free to contact us.\n\n` +
      `- NestSweet Bakers Team 🍰`
    );
    
    return message;
  };

  // ✅ Updated updateStatus function with WhatsApp notification
  const updateStatus = async (id: string, status: string, sendWhatsApp: boolean = false) => {
    try {
      await updateDoc(doc(db, 'customRequests', id), {
        status,
        updatedAt: serverTimestamp(),
      });

      const updatedRequest = requests.find(r => r.id === id);
      
      setRequests(requests.map(request =>
        request.id === id ? { ...request, status: status as any } : request
      ));

      showSuccess(`✅ Request status updated to ${status}`);

      // ✅ Open WhatsApp with pre-filled message if requested
      if (sendWhatsApp && updatedRequest && updatedRequest.phone) {
        const message = generateStatusMessage(updatedRequest, status);
        const whatsappUrl = `https://wa.me/${updatedRequest.phone.replace(/[^0-9]/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('❌ Failed to update status');
    }
  };

  const handleSaveNotes = async (requestId: string) => {
    setSavingNotes(true);
    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      if (quotedPrice) {
        updateData.quotedPrice = parseFloat(quotedPrice);
      }

      await updateDoc(doc(db, 'customRequests', requestId), updateData);

      setRequests(requests.map(request =>
        request.id === requestId 
          ? { 
              ...request, 
              adminNotes: adminNotes || request.adminNotes,
              quotedPrice: quotedPrice ? parseFloat(quotedPrice) : request.quotedPrice
            } 
          : request
      ));

      setEditingNotes(null);
      setAdminNotes('');
      setQuotedPrice('');
      showSuccess('✅ Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      showError('❌ Failed to save notes');
    } finally {
      setSavingNotes(false);
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
      await updateStatus(request.id, 'approved');
      
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
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading custom requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <Cake size={14} className="flex-shrink-0" />
                        #{request.id.slice(0, 8)}
                      </p>
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

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="text-2xl font-bold text-pink-600">₹{request.budget}</p>
                      {request.quotedPrice && (
                        <p className="text-sm text-green-600 font-semibold">
                          Quoted: ₹{request.quotedPrice}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {expandedRequest === request.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRequest === request.id && (
                <div className="p-4 md:p-6 bg-gray-50 space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Eye size={18} className="text-pink-600" />
                      Customer Details
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Phone className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="flex-1">
                            <p className="text-gray-500 text-xs">Name & Phone</p>
                            <p className="font-semibold text-gray-800">{request.name}</p>
                            <a
                              href={`tel:${request.phone}`}
                              className="text-pink-600 hover:text-pink-700 font-medium"
                            >
                              {request.phone}
                            </a>
                          </div>
                        </div>

                        {(request.email || request.userEmail) && (
                          <div className="flex items-start gap-3">
                            <Mail className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                            <div className="flex-1">
                              <p className="text-gray-500 text-xs">Email</p>
                              <p className="font-semibold text-gray-800 break-all">{request.email || request.userEmail}</p>
                            </div>
                          </div>
                        )}

                        {request.deliveryAddress && (
                          <div className="flex items-start gap-3">
                            <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                            <div className="flex-1">
                              <p className="text-gray-500 text-xs">Delivery Address</p>
                              <p className="font-semibold text-gray-800">{request.deliveryAddress}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-xl p-4 space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Calendar className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="flex-1">
                            <p className="text-gray-500 text-xs">Delivery Date</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(request.deliveryDate).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                          <div className="flex-1">
                            <p className="text-gray-500 text-xs">Urgency</p>
                            <p className="font-semibold text-gray-800 capitalize">
                              {request.urgency === 'urgent' ? '🔴 Urgent' : '🟢 Normal'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cake Specifications */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">Cake Specifications</h4>
                    <div className="bg-white rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Flavor</p>
                        <p className="font-semibold">{request.flavor}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Size</p>
                        <p className="font-semibold">{request.size}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Servings</p>
                        <p className="font-semibold">{request.servings || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Tiers</p>
                        <p className="font-semibold">{request.tier || '1'} {request.tier === '1' ? 'Tier' : 'Tiers'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Type</p>
                        <p className="font-semibold">{request.eggless ? '🥚 Eggless' : 'Regular'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Budget</p>
                        <p className="font-semibold text-pink-600">₹{request.budget}</p>
                      </div>
                      {request.quotedPrice && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Your Quote</p>
                          <p className="font-semibold text-green-600">₹{request.quotedPrice}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Design Description */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">Design Description</h4>
                    <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{request.design}</p>
                    </div>
                  </div>

                  {/* Additional Message */}
                  {request.message && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <MessageSquare size={18} className="text-blue-600" />
                        Additional Notes
                      </h4>
                      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                        <p className="text-gray-700 whitespace-pre-wrap">{request.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Reference Images */}
                  {request.referenceImages && request.referenceImages.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <ImageIcon size={18} className="text-purple-600" />
                        Reference Images ({request.referenceImages.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {request.referenceImages.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative h-40 rounded-xl overflow-hidden cursor-pointer group border-4 border-white shadow-lg"
                            onClick={() => setViewImage(url)}
                          >
                            <Image
                              src={url}
                              alt={`Reference ${idx + 1}`}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="(max-width: 768px) 50vw, 20vw"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Notes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Edit size={18} className="text-green-600" />
                        Admin Notes & Quote
                      </h4>
                      {!editingNotes && (
                        <button
                          onClick={() => {
                            setEditingNotes(request.id);
                            setAdminNotes(request.adminNotes || '');
                            setQuotedPrice(request.quotedPrice?.toString() || '');
                          }}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold flex items-center gap-2"
                        >
                          <Edit size={16} />
                          {request.adminNotes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                      )}
                    </div>

                    {editingNotes === request.id ? (
                      <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Admin Notes
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes about design feasibility, modifications, timeline, etc..."
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quoted Price (₹)
                          </label>
                          <input
                            type="number"
                            value={quotedPrice}
                            onChange={(e) => setQuotedPrice(e.target.value)}
                            placeholder="Enter your quote"
                            min="0"
                            step="1"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleSaveNotes(request.id)}
                            disabled={savingNotes}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {savingNotes ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                Save Notes
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes(null);
                              setAdminNotes('');
                              setQuotedPrice('');
                            }}
                            className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {request.adminNotes && (
                          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                            <p className="text-gray-700 whitespace-pre-wrap">{request.adminNotes}</p>
                            {request.quotedPrice && (
                              <p className="mt-3 font-bold text-green-600 text-lg">
                                Quoted Price: ₹{request.quotedPrice}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* ✅ UPDATED: Actions with WhatsApp Status Notification */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3">Update Status</h4>
                      <div className="flex flex-wrap gap-3">
                        {STATUS_OPTIONS.map(status => (
                          <button
                            key={status.value}
                            onClick={() => updateStatus(request.id, status.value, true)}
                            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                              request.status === status.value
                                ? status.color + ' border-2'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {getStatusIcon(status.value)}
                            {status.label}
                            {request.status === status.value && ' ✓'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Clicking a status will open WhatsApp with a pre-filled message to the customer
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => convertToOrder(request)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold flex items-center gap-2"
                      >
                        <Package size={18} />
                        Convert to Order
                      </button>

                      {request.phone && (
                        <>
                          <a
                            href={`tel:${request.phone}`}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold flex items-center gap-2"
                          >
                            <Phone size={18} />
                            Call
                          </a>

                          <a
                            href={`https://wa.me/${request.phone.replace(/[^0-9]/g, '')}?text=${generateStatusMessage(request, request.status)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold flex items-center gap-2"
                          >
                            <MessageCircle size={18} />
                            WhatsApp
                          </a>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(request.id)}
                        className="px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-semibold flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                        Delete
                      </button>
                    </div>
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
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
