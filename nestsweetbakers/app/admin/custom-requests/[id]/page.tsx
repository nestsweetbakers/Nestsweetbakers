'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import {
  Cake, Clock, CheckCircle, XCircle, Loader2, User, Calendar,
  Phone, MessageCircle, Mail, MapPin, ArrowLeft, Copy, Check,
  Edit, Save, Send, Trash2, Package, AlertCircle, Image as ImageIcon,
  Eye, Users, Layers, DollarSign, Bell, Zap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';

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

export default function CustomRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { showSuccess, showError } = useToast();

  const [request, setRequest] = useState<CustomRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [viewImage, setViewImage] = useState<string | null>(null);

  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{
    show: boolean;
    newStatus: string;
    message: string;
  }>({ show: false, newStatus: '', message: '' });

  useEffect(() => {
    fetchRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const requestDoc = await getDoc(doc(db, 'customRequests', requestId));
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        setRequest({
          id: requestDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as CustomRequest);
        setAdminNotes(data.adminNotes || '');
        setQuotedPrice(data.quotedPrice?.toString() || '');
      } else {
        showError('Request not found');
        router.push('/admin/custom-requests');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      showError('Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp status message
  const generateStatusMessage = (newStatus: string) => {
    if (!request) return '';

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
      (quotedPrice ? `Quoted Price: ₹${quotedPrice}\n` : '') +
      `Delivery Date: ${new Date(request.deliveryDate).toLocaleDateString('en-IN')}\n\n` +
      (adminNotes ? `Notes: ${adminNotes}\n\n` : '') +
      `Thank you for choosing NestSweet Bakers!\n\n` +
      `For any queries, feel free to contact us.`;
    
    return message;
  };

  // Create in-app notification
  const createNotification = async (newStatus: string, oldStatus: string) => {
    if (!request || !request.userId || oldStatus === newStatus) return;

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
          body = `Your custom ${request.occasion} cake request has been approved${quotedPrice ? ` at ₹${quotedPrice}` : ''}.`;
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
  const updateStatus = async (newStatus: string, skipWhatsApp = false, customMessage?: string) => {
    if (!request) return;

    // Show WhatsApp modal if not skipping
    if (!skipWhatsApp && !customMessage && request.phone && newStatus !== request.status) {
      const defaultMessage = generateStatusMessage(newStatus);
      setWhatsappModal({
        show: true,
        newStatus,
        message: defaultMessage
      });
      return;
    }

    setUpdating(true);
    try {
      const oldStatus = request.status;

      await updateDoc(doc(db, 'customRequests', requestId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setRequest({ ...request, status: newStatus as any });

      // Create in-app notification
      await createNotification(newStatus, oldStatus);

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
      setUpdating(false);
    }
  };

  // Handle WhatsApp send
  const handleSendWhatsApp = () => {
    if (whatsappModal.newStatus) {
      updateStatus(whatsappModal.newStatus, true, whatsappModal.message);
      setWhatsappModal({ show: false, newStatus: '', message: '' });
    }
  };

  // Save admin notes
  const saveAdminNotes = async () => {
    if (!request) return;

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

      setRequest({
        ...request,
        adminNotes: adminNotes || request.adminNotes,
        quotedPrice: quotedPrice ? parseFloat(quotedPrice) : request.quotedPrice
      });

      setEditingNotes(false);
      showSuccess('✅ Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      showError('❌ Failed to save notes');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'customRequests', requestId));
      showSuccess('✅ Request deleted successfully');
      router.push('/admin/custom-requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      showError('❌ Failed to delete request');
    }
  };

  const convertToOrder = async () => {
    if (!request) return;
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
      await updateStatus('approved', true);
      
      showSuccess('✅ Converted to order successfully!');
    } catch (error) {
      console.error('Error converting to order:', error);
      showError('❌ Failed to convert to order');
    }
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
    return <StatusIcon size={20} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <Cake className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Not Found</h2>
        <Link href="/admin/custom-requests" className="text-pink-600 hover:text-pink-700">
          ← Back to Requests
        </Link>
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
                  <p className="text-sm text-gray-600">Request #{request.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModal({ show: false, newStatus: '', message: '' })}
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
                Message to {request.name}
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
                  updateStatus(whatsappModal.newStatus, true);
                  setWhatsappModal({ show: false, newStatus: '', message: '' });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/custom-requests"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{request.occasion} Cake Request</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Calendar size={16} />
              {request.createdAt?.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(request.id)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            Copy ID
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-lg ${getStatusColor(request.status)}`}>
          {getStatusIcon(request.status)}
          {request.status.toUpperCase()}
        </span>
        {request.eggless && (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full border-2 border-green-200 font-semibold">
            🥚 Eggless
          </span>
        )}
        {request.urgency === 'urgent' && (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full border-2 border-red-200 font-semibold">
            🔴 Urgent
          </span>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Request Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User className="text-pink-600" size={24} />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="text-gray-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-semibold">{request.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="text-gray-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a href={`tel:${request.phone}`} className="font-semibold text-pink-600 hover:text-pink-700">
                    {request.phone}
                  </a>
                </div>
              </div>
              {(request.email || request.userEmail) && (
                <div className="flex items-start gap-3">
                  <Mail className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold break-all">{request.email || request.userEmail}</p>
                  </div>
                </div>
              )}
              {request.deliveryAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-semibold">{request.deliveryAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cake Specifications */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Cake className="text-pink-600" size={24} />
              Cake Specifications
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Flavor</p>
                <p className="font-bold text-lg">{request.flavor}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Size</p>
                <p className="font-bold text-lg">{request.size}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Servings</p>
                <p className="font-bold text-lg">{request.servings || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Tiers</p>
                <p className="font-bold text-lg">{request.tier || '1'}</p>
              </div>
            </div>
          </div>

          {/* Design Description */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Design Description</h2>
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <p className="text-gray-700 whitespace-pre-wrap">{request.design}</p>
            </div>
          </div>

          {/* Additional Message */}
          {request.message && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="text-blue-600" size={24} />
                Additional Notes
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{request.message}</p>
            </div>
          )}

          {/* Reference Images */}
          {request.referenceImages && request.referenceImages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="text-purple-600" size={24} />
                Reference Images ({request.referenceImages.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {request.referenceImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative h-48 rounded-xl overflow-hidden cursor-pointer group border-4 border-white shadow-lg"
                    onClick={() => setViewImage(url)}
                  >
                    <Image
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Summary */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="text-orange-600" size={24} />
              Update Status
            </h2>
            <select
              value={request.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:opacity-50 font-semibold mb-3"
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {updating && (
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                <Loader2 className="animate-spin" size={12} />
                Updating status...
              </p>
            )}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Bell size={12} />
              Customer will receive in-app and WhatsApp notifications
            </p>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" size={24} />
              Pricing
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Budget</span>
                <span className="font-bold text-xl text-pink-600">₹{request.budget}</span>
              </div>
              {request.quotedPrice && (
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-600 font-semibold">Your Quote</span>
                  <span className="font-bold text-2xl text-green-600">₹{request.quotedPrice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit className="text-gray-600" size={24} />
                Admin Notes
              </h2>
              {!editingNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit size={18} />
                </button>
              ) : (
                <button
                  onClick={saveAdminNotes}
                  className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition"
                >
                  <Save size={18} />
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-4">
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

                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setAdminNotes(request.adminNotes || '');
                    setQuotedPrice(request.quotedPrice?.toString() || '');
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {request.adminNotes ? (
                  <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.adminNotes}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No notes added yet</p>
                )}
              </>
            )}
          </div>

          {/* Delivery Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Delivery</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="font-semibold">
                    {new Date(request.deliveryDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Urgency</p>
                  <p className="font-semibold capitalize">
                    {request.urgency === 'urgent' ? '🔴 Urgent' : '🟢 Normal'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={convertToOrder}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
              >
                <Package size={18} />
                Convert to Order
              </button>

              {request.phone && (
                <>
                  <a
                    href={`tel:${request.phone}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <Phone size={18} />
                    Call Customer
                  </a>

                  <a
                    href={`https://wa.me/${request.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </a>
                </>
              )}

              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold"
              >
                <Trash2 size={18} />
                Delete Request
              </button>
            </div>
          </div>
        </div>
      </div>

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
