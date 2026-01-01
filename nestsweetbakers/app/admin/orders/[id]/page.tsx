'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import {
  Package, Clock, CheckCircle, XCircle, Loader2, Truck, Calendar,
  Phone, MessageCircle, Mail, MapPin, User, ArrowLeft, Share2,
  Copy, Check, Printer, Gift, FileText, DollarSign, AlertCircle,
  ChevronRight, ShoppingBag, Info, Send, Edit2, Save, Zap, Bell
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';
import { notificationService } from '@/lib/notificationService';

interface OrderItem {
  cakeId: string;
  cakeName: string;
  cakeImage?: string;
  quantity: number;
  weight: string;
  basePrice: number;
  totalPrice: number;
  customization?: string;
  category?: string;
  flavor?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  pincode: string;
}

interface TrackingSteps {
  placed: boolean;
  confirmed: boolean;
  preparing: boolean;
  outForDelivery: boolean;
  delivered: boolean;
}

interface Order {
  id: string;
  orderRef: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone: string;
  items: OrderItem[];
  customerInfo: CustomerInfo;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  isGift: boolean;
  recipientName?: string;
  giftMessage?: string;
  occasionType?: string;
  specialInstructions?: string;
  orderNote?: string;
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  tax: number;
  discount: number;
  promoCode?: string;
  total: number;
  paymentMethod: 'whatsapp' | 'online' | 'cod';
  paymentStatus: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  orderStatus: string;
  trackingSteps: TrackingSteps;
  source: string;
  deviceInfo?: any;
  createdAt: any;
  updatedAt?: any;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { showSuccess, showError } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{
    show: boolean;
    newStatus: string;
    message: string;
  }>({ show: false, newStatus: '', message: '' });

  useEffect(() => {
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({
          id: orderDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Order);
        setAdminNote(data.adminNote || '');
      } else {
        showError('Order not found');
        router.push('/admin/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      showError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // Generate WhatsApp status message
  const generateStatusMessage = (newStatus: string) => {
    if (!order) return '';

    let statusEmoji = '';
    let statusText = '';
    
    switch (newStatus) {
      case 'pending':
        statusEmoji = '⏳';
        statusText = 'Your order is pending confirmation.';
        break;
      case 'processing':
        statusEmoji = '👨‍🍳';
        statusText = 'Your order is being prepared!';
        break;
      case 'completed':
        statusEmoji = '✅';
        statusText = 'Your order is ready for delivery/pickup!';
        break;
      case 'cancelled':
        statusEmoji = '❌';
        statusText = 'Your order has been cancelled.';
        break;
      default:
        statusEmoji = '📦';
        statusText = `Order status updated to ${newStatus}`;
    }

    const message = 
      `Hello ${order.userName},\n\n` +
      `${statusEmoji} ${statusText}\n\n` +
      `ORDER DETAILS:\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `Order ID: #${order.orderRef}\n` +
      `Items: ${order.items.map(i => `${i.cakeName} (${i.weight})`).join(', ')}\n` +
      `Total Amount: ₹${order.total}\n` +
      `Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString('en-IN')}\n` +
      `Delivery Time: ${order.deliveryTime === 'morning' ? '9 AM - 12 PM' : order.deliveryTime === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}\n\n` +
      `Thank you for choosing NestSweet Bakers!\n\n` +
      `For any queries, feel free to contact us.`;
    
    return message;
  };

  // Create in-app notification
  const createNotification = async (newStatus: string, oldStatus: string) => {
    if (!order || !order.userId || oldStatus === newStatus) return;

    try {
      let title = '';
      let body = '';
      let type: 'info' | 'success' | 'warning' = 'info';

      switch (newStatus) {
        case 'processing':
          title = 'Order Being Prepared';
          body = `Your order #${order.orderRef} is now being prepared. We'll update you when it's ready!`;
          type = 'info';
          break;
        case 'completed':
          title = 'Order Ready!';
          body = `Your order #${order.orderRef} is ready for delivery. Get ready for delicious cakes!`;
          type = 'success';
          break;
        case 'cancelled':
          title = 'Order Cancelled';
          body = `Your order #${order.orderRef} has been cancelled. Contact us if you have questions.`;
          type = 'warning';
          break;
        default:
          title = 'Order Update';
          body = `Your order #${order.orderRef} status has been updated to ${newStatus}.`;
          type = 'info';
      }

      await addDoc(collection(db, 'notifications'), {
        userId: order.userId,
        orderId: order.id,
        orderRef: order.orderRef,
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

  // Update order status
  const updateOrderStatus = async (newStatus: string, skipWhatsApp = false, customMessage?: string) => {
    if (!order) return;

    // Show WhatsApp modal if not skipping
    if (!skipWhatsApp && !customMessage && order.userPhone && newStatus !== order.status) {
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
      const oldStatus = order.status;

      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setOrder({ ...order, status: newStatus as any });

      // Create in-app notification
      await createNotification(newStatus, oldStatus);

      // Send Firebase notification
      if (order.userId && oldStatus !== newStatus) {
        notificationService.notifyOrderStatusChange({
          orderId,
          userId: order.userId,
          customerName: order.userName,
          cakeName: order.items[0]?.cakeName || 'Order',
          oldStatus,
          newStatus,
        }).catch(err => console.error('Failed to send notification', err));
      }

      showSuccess(`✅ Order status updated to ${newStatus}`);

      // Open WhatsApp if custom message provided
      if (customMessage && order.userPhone) {
        const whatsappUrl = `https://wa.me/${order.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customMessage)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle WhatsApp send
  const handleSendWhatsApp = () => {
    if (whatsappModal.newStatus) {
      updateOrderStatus(whatsappModal.newStatus, true, whatsappModal.message);
      setWhatsappModal({ show: false, newStatus: '', message: '' });
    }
  };

  // Save admin note
  const saveAdminNote = async () => {
    if (!order) return;

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        adminNote,
        updatedAt: serverTimestamp(),
      });
      showSuccess('Note saved successfully');
      setEditingNote(false);
    } catch (error) {
      console.error('Error saving note:', error);
      showError('Failed to save note');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const printInvoice = () => {
    if (!order) return;

    const itemsList = order.items.map((item, idx) =>
      `<div class="row"><span>${idx + 1}. ${item.cakeName} (${item.weight})</span><span>₹${item.totalPrice}</span></div>`
    ).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.orderRef}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e91e63; padding-bottom: 20px; }
          .details { margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px; }
          .row:nth-child(even) { background: #f9f9f9; }
          .total { font-size: 24px; font-weight: bold; color: #e91e63; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; }
          .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NestSweet Bakers</h1>
          <p>Order Invoice</p>
        </div>

        <div class="section">
          <h2>Order #${order.orderRef}</h2>
          <div class="row"><span>Order Date</span><span>${new Date(order.createdAt).toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>Delivery Date</span><span>${new Date(order.deliveryDate).toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>Payment Method</span><span>${order.paymentMethod.toUpperCase()}</span></div>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <div class="row"><span>Name</span><span>${order.userName}</span></div>
          <div class="row"><span>Phone</span><span>${order.userPhone || 'N/A'}</span></div>
          ${order.userEmail ? `<div class="row"><span>Email</span><span>${order.userEmail}</span></div>` : ''}
          <div class="row"><span>Address</span><span>${order.deliveryAddress}</span></div>
        </div>

        <div class="section">
          <h3>Order Items</h3>
          ${itemsList}
        </div>

        <div class="section">
          <h3>Payment Breakdown</h3>
          <div class="row"><span>Subtotal</span><span>₹${order.subtotal}</span></div>
          <div class="row"><span>Delivery Fee</span><span>₹${order.deliveryFee}</span></div>
          <div class="row"><span>Packaging Fee</span><span>₹${order.packagingFee}</span></div>
          ${order.discount > 0 ? `<div class="row"><span>Discount</span><span>-₹${order.discount}</span></div>` : ''}
          <div class="row total"><span>Total Amount</span><span>₹${order.total.toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
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
          <p className="text-gray-600 font-semibold">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h2>
        <Link href="/admin/orders" className="text-pink-600 hover:text-pink-700">
          ← Back to Orders
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
                  <p className="text-sm text-gray-600">Order #{order.orderRef}</p>
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
                <Info className="inline mr-2" size={16} />
                Status will be updated to <strong className="uppercase">{whatsappModal.newStatus}</strong> and customer will receive this message on WhatsApp.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message to {order.userName}
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
                  updateOrderStatus(whatsappModal.newStatus, true);
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
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Order #{order.orderRef}</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Calendar size={16} />
              {new Date(order.createdAt).toLocaleDateString('en-IN', { 
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
            onClick={() => copyToClipboard(order.orderRef)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            Copy ID
          </button>
          <button
            onClick={printInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-lg ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)}
          {order.status.toUpperCase()}
        </span>
        {order.isGift && (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full border-2 border-purple-200 font-semibold">
            <Gift size={18} />
            Gift Order
          </span>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="text-pink-600" size={24} />
              Order Items ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  {item.cakeImage && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.cakeImage}
                        alt={item.cakeName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg">{item.cakeName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      {item.flavor && (
                        <span className="bg-white px-2 py-0.5 rounded border">{item.flavor}</span>
                      )}
                      {item.category && (
                        <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">{item.category}</span>
                      )}
                      <span className="font-medium">{item.weight}</span>
                      <span>×{item.quantity}</span>
                    </div>
                    {item.customization && (
                      <p className="text-sm text-purple-700 bg-purple-50 px-2 py-1 rounded mt-2">
                        {item.customization}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-pink-600">₹{item.totalPrice}</p>
                    <p className="text-sm text-gray-500">₹{item.basePrice}/kg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                  <p className="font-semibold">{order.userName}</p>
                </div>
              </div>
              {order.userPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a href={`tel:${order.userPhone}`} className="font-semibold text-pink-600 hover:text-pink-700">
                      {order.userPhone}
                    </a>
                  </div>
                </div>
              )}
              {order.userEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="text-gray-400 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold break-all">{order.userEmail}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="text-gray-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Delivery Address</p>
                  <p className="font-semibold">{order.deliveryAddress}</p>
                  {order.customerInfo.city && (
                    <p className="text-sm text-gray-600">{order.customerInfo.city}, {order.customerInfo.pincode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Truck className="text-pink-600" size={24} />
              Delivery Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Delivery Date</p>
                <p className="font-bold text-lg">
                  {new Date(order.deliveryDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Delivery Time</p>
                <p className="font-bold text-lg">
                  {order.deliveryTime === 'morning' ? '9 AM - 12 PM' : 
                   order.deliveryTime === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="font-bold text-lg uppercase">{order.paymentMethod}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Source</p>
                <p className="font-bold text-lg capitalize">{order.source}</p>
              </div>
            </div>
          </div>

          {/* Gift Info */}
          {order.isGift && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="text-purple-600" size={24} />
                Gift Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Recipient Name</p>
                  <p className="font-semibold text-lg">{order.recipientName}</p>
                </div>
                {order.occasionType && (
                  <div>
                    <p className="text-sm text-gray-600">Occasion</p>
                    <p className="font-semibold capitalize">{order.occasionType}</p>
                  </div>
                )}
                {order.giftMessage && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Gift Message</p>
                    <p className="italic bg-white p-3 rounded-lg border border-purple-200">&quot;{order.giftMessage}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {(order.specialInstructions || order.orderNote) && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                Notes & Instructions
              </h2>
              <div className="space-y-3">
                {order.specialInstructions && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Special Instructions</p>
                    <p className="bg-white p-3 rounded-lg">{order.specialInstructions}</p>
                  </div>
                )}
                {order.orderNote && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Order Note</p>
                    <p className="bg-white p-3 rounded-lg">{order.orderNote}</p>
                  </div>
                )}
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
              value={order.status}
              onChange={(e) => updateOrderStatus(e.target.value)}
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

          {/* Payment Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" size={24} />
              Payment Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold">{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Packaging Fee</span>
                <span className="font-semibold">₹{order.packagingFee}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">₹{order.tax.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.promoCode && `(${order.promoCode})`}</span>
                  <span className="font-semibold">-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 pt-3">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-pink-600">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-gray-600" size={24} />
                Admin Notes
              </h2>
              {!editingNote ? (
                <button
                  onClick={() => setEditingNote(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit2 size={18} />
                </button>
              ) : (
                <button
                  onClick={saveAdminNote}
                  className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition"
                >
                  <Save size={18} />
                </button>
              )}
            </div>
            {editingNote ? (
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                placeholder="Add internal notes..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            ) : (
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg min-h-[100px]">
                {adminNote || 'No notes added yet'}
              </p>
            )}
          </div>

          {/* Contact Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Contact Customer</h2>
            <div className="space-y-2">
              {order.userPhone && (
                <>
                  <a
                    href={`tel:${order.userPhone}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <Phone size={18} />
                    Call Customer
                  </a>
                  <a
                    href={`https://wa.me/${order.userPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
