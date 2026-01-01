'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { notificationService } from '@/lib/notificationService';
import {
  Package, Search, Download, Phone, Mail, MapPin, Calendar, Loader2, Eye,
  ChevronDown, ChevronUp, Trash2, CheckSquare, Square, Grid3x3, List, Printer,
  RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Gift, FileText, CreditCard,
  Truck, User, ShoppingCart, DollarSign, MessageCircle, TrendingUp, Percent, Info
} from 'lucide-react';
import Image from 'next/image';

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
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    id: string | string[];
    type: 'delete' | 'status';
    status?: string;
    isBulk?: boolean;
  }>({ show: false, id: '', type: 'delete', isBulk: false });

  const { showSuccess, showError } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || Date.now()),
      } as Order));

      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter and Sort orders
  useEffect(() => {
    let result = [...orders];

    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(order => {
        const orderDate = order.createdAt;
        switch (dateFilter) {
          case 'today':
            return orderDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.userName?.toLowerCase().includes(search) ||
        order.userPhone?.includes(search) ||
        order.orderRef?.toLowerCase().includes(search) ||
        order.id?.toLowerCase().includes(search) ||
        order.items?.some(item => item.cakeName?.toLowerCase().includes(search))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = a.total - b.total;
          break;
        case 'name':
          comparison = a.userName.localeCompare(b.userName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(result);
  }, [orders, statusFilter, dateFilter, searchTerm, sortBy, sortOrder]);

  const updateOrderStatus = async (orderId: string, newStatus: string, skipConfirm = false) => {
    if (!skipConfirm && (newStatus === 'cancelled' || newStatus === 'completed')) {
      setConfirmModal({ show: true, id: orderId, type: 'status', status: newStatus, isBulk: false });
      return;
    }

    setUpdating(orderId);
    try {
      const updatedOrder = orders.find(o => o.id === orderId);
      const oldStatus = updatedOrder?.status;

      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));

      if (updatedOrder && oldStatus !== newStatus && updatedOrder.userId) {
        notificationService.notifyOrderStatusChange({
          orderId,
          userId: updatedOrder.userId,
          customerName: updatedOrder.userName,
          cakeName: updatedOrder.items[0]?.cakeName || 'Order',
          oldStatus: oldStatus!,
          newStatus,
        }).catch(err => console.error('Failed to send notification', err));
      }

      showSuccess(`✅ Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      showError('Please select orders first');
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedOrders.forEach(orderId => {
        batch.update(doc(db, 'orders', orderId), {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      setOrders(orders.map(order =>
        selectedOrders.has(order.id) ? { ...order, status: newStatus as any } : order
      ));

      setSelectedOrders(new Set());
      setBulkActionMode(false);
      showSuccess(`✅ ${selectedOrders.size} orders updated to ${newStatus}`);
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to update orders');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const batch = writeBatch(db);
      Array.from(selectedOrders).forEach(orderId => {
        batch.delete(doc(db, 'orders', orderId));
      });

      await batch.commit();

      setOrders(orders.filter(o => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      setBulkActionMode(false);
      showSuccess(`✅ ${selectedOrders.size} orders deleted`);
      setConfirmModal({ show: false, id: '', type: 'delete', isBulk: false });
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to delete orders');
    }
  };

  const toggleSelectOrder = (id: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const printInvoice = (order: Order) => {
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
          <div class="row"><span>Delivery Time</span><span>${order.deliveryTime === 'morning' ? '9 AM - 12 PM' : order.deliveryTime === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}</span></div>
          <div class="row"><span>Payment Method</span><span>${order.paymentMethod.toUpperCase()}</span></div>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <div class="row"><span>Name</span><span>${order.userName}</span></div>
          <div class="row"><span>Phone</span><span>${order.userPhone || 'N/A'}</span></div>
          ${order.userEmail ? `<div class="row"><span>Email</span><span>${order.userEmail}</span></div>` : ''}
          <div class="row"><span>Address</span><span>${order.deliveryAddress}</span></div>
          ${order.customerInfo.city ? `<div class="row"><span>City</span><span>${order.customerInfo.city}, ${order.customerInfo.pincode}</span></div>` : ''}
        </div>

        ${order.isGift ? `
          <div class="section" style="background: #fff3e0;">
            <h3>🎁 Gift Order</h3>
            <div class="row"><span>Recipient</span><span>${order.recipientName}</span></div>
            <div class="row"><span>Occasion</span><span>${order.occasionType}</span></div>
            ${order.giftMessage ? `<div class="row"><span>Message</span><span>${order.giftMessage}</span></div>` : ''}
          </div>
        ` : ''}

        <div class="section">
          <h3>Order Items</h3>
          ${itemsList}
        </div>

        ${order.specialInstructions || order.orderNote ? `
          <div class="section">
            <h3>Special Instructions</h3>
            ${order.specialInstructions ? `<p><strong>Instructions:</strong> ${order.specialInstructions}</p>` : ''}
            ${order.orderNote ? `<p><strong>Note:</strong> ${order.orderNote}</p>` : ''}
          </div>
        ` : ''}

        <div class="section">
          <h3>Payment Breakdown</h3>
          <div class="row"><span>Subtotal</span><span>₹${order.subtotal}</span></div>
          <div class="row"><span>Delivery Fee</span><span>₹${order.deliveryFee}</span></div>
          <div class="row"><span>Packaging Fee</span><span>₹${order.packagingFee}</span></div>
          ${order.tax > 0 ? `<div class="row"><span>Tax</span><span>₹${order.tax.toFixed(2)}</span></div>` : ''}
          ${order.discount > 0 ? `<div class="row"><span>Discount${order.promoCode ? ` (${order.promoCode})` : ''}</span><span>-₹${order.discount}</span></div>` : ''}
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

  const exportToCSV = () => {
    const headers = ['Order Ref', 'Order Date', 'Customer', 'Phone', 'Email', 'Items', 'Quantity', 'Total', 'Payment', 'Status', 'Delivery Date', 'Gift', 'Promo'];
    const rows = filteredOrders.map(order => [
      order.orderRef,
      new Date(order.createdAt).toLocaleDateString('en-IN'),
      order.userName,
      order.userPhone || 'N/A',
      order.userEmail || '',
      order.items.map(i => i.cakeName).join('; '),
      order.items.reduce((sum, i) => sum + i.quantity, 0),
      order.total,
      order.paymentMethod,
      order.status,
      new Date(order.deliveryDate).toLocaleDateString('en-IN'),
      order.isGift ? 'Yes' : 'No',
      order.promoCode || ''
    ]);

    const csvContent = [headers, ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess('✅ Orders exported successfully');
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const StatusIcon = STATUS_OPTIONS.find(s => s.value === status)?.icon || Clock;
    return <StatusIcon size={16} />;
  };

  // ✅ Generate WhatsApp message with order details
  const generateWhatsAppMessage = (order: Order) => {
    const message = encodeURIComponent(
      `Hello ${order.userName},\n\n` +
      `Your order #${order.orderRef} has been received!\n\n` +
      `📦 Order Details:\n` +
      order.items.map(item => `• ${item.cakeName} (${item.weight}) x${item.quantity}`).join('\n') +
      `\n\n💰 Total: ₹${order.total}\n` +
      `📅 Delivery: ${new Date(order.deliveryDate).toLocaleDateString('en-IN')}\n` +
      `⏰ Time: ${order.deliveryTime === 'morning' ? '9 AM - 12 PM' : order.deliveryTime === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}\n\n` +
      `We'll keep you updated on your order status.\n\n` +
      `Thank you for choosing NestSweet Bakers! 🍰`
    );
    return message;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-yellow-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {confirmModal.type === 'delete' ? 'Delete Orders?' : 'Update Order Status?'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {confirmModal.type === 'delete'
                ? `Are you sure you want to delete ${confirmModal.isBulk ? `${selectedOrders.size} orders` : 'this order'}? This action cannot be undone.`
                : `Update order status to "${confirmModal.status}"?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', type: 'delete', isBulk: false })}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'delete') {
                    handleBulkDelete();
                  } else if (confirmModal.type === 'status' && confirmModal.status) {
                    updateOrderStatus(confirmModal.id as string, confirmModal.status, true);
                  }
                  setConfirmModal({ show: false, id: '', type: 'delete', isBulk: false });
                }}
                className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Orders Management
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Package size={16} />
            Manage and track all customer orders
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
          <p className="text-gray-600 text-sm font-medium">Total Orders</p>
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
          <p className="text-green-700 text-sm font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.completed}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-4 border-2 border-red-200">
          <p className="text-red-700 text-sm font-medium">Cancelled</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.cancelled}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-4 border-2 border-purple-200">
          <p className="text-purple-700 text-sm font-medium">Revenue</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">₹{stats.totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label} ({orders.filter(o => o.status === status.value).length})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="name-asc">Customer (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkActionMode(!bulkActionMode);
                setSelectedOrders(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                bulkActionMode 
                  ? 'bg-pink-100 text-pink-700 border-2 border-pink-200'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
              }`}
            >
              <CheckSquare size={18} />
              {bulkActionMode ? 'Cancel' : 'Bulk Actions'}
            </button>

            {bulkActionMode && (
              <>
                <button
                  onClick={selectAllOrders}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold border-2 border-blue-200"
                >
                  {selectedOrders.size === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </button>

                {selectedOrders.size > 0 && (
                  <>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleBulkStatusUpdate(e.target.value);
                        e.target.value = '';
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold"
                    >
                      <option value="">Update Status ({selectedOrders.size})</option>
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setConfirmModal({ show: true, id: Array.from(selectedOrders), type: 'delete', isBulk: true })}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                    >
                      <Trash2 size={18} />
                      Delete ({selectedOrders.size})
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="mx-auto mb-4 text-gray-300" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No orders found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all ${
                selectedOrders.has(order.id) ? 'ring-4 ring-pink-500' : ''
              }`}
            >
              {/* Order Header */}
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {bulkActionMode && (
                      <button
                        onClick={() => toggleSelectOrder(order.id)}
                        className="flex-shrink-0"
                      >
                        {selectedOrders.has(order.id) ? (
                          <CheckSquare className="text-pink-600" size={24} />
                        ) : (
                          <Square className="text-gray-400" size={24} />
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm text-gray-800">{order.orderRef}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                        {order.isGift && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
                            <Gift size={12} />
                            Gift
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{order.userName}</p>
                      <p className="text-xs text-gray-500">
                        {order.items.length} items · {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xl font-bold text-pink-600">₹{order.total.toFixed(2)}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => printInvoice(order)}
                        className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {expandedOrder === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="flex gap-2 flex-wrap">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1 text-xs">
                      {item.cakeImage && (
                        <div className="relative w-6 h-6 rounded overflow-hidden">
                          <Image
                            src={item.cakeImage}
                            alt={item.cakeName}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        </div>
                      )}
                      <span className="font-medium">{item.cakeName}</span>
                      <span className="text-gray-500">×{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-xs text-gray-500 px-2 py-1">+{order.items.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="p-4 md:p-6 bg-gray-50 space-y-6">
                  {/* Order Items */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <ShoppingCart size={18} className="text-pink-600" />
                      Order Items ({order.items.length})
                    </h4>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 flex gap-3">
                          {item.cakeImage && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={item.cakeImage}
                                alt={item.cakeName}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{item.cakeName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                              {item.flavor && (
                                <span className="bg-gray-100 px-2 py-0.5 rounded">{item.flavor}</span>
                              )}
                              {item.category && (
                                <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">{item.category}</span>
                              )}
                              <span className="font-medium">{item.weight}</span>
                            </div>
                            {item.customization && (
                              <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded mt-1">
                                {item.customization}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-pink-600">₹{item.totalPrice}</p>
                            <p className="text-xs text-gray-500">₹{item.basePrice}/kg</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <User size={18} className="text-pink-600" />
                        Customer Details
                      </h4>
                      <div className="space-y-2 text-sm bg-white rounded-lg p-3">
                        {/* ✅ FIXED: Added optional chaining */}
                        {order.userPhone && (
                          <div className="flex items-start gap-2">
                            <Phone className="text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <a href={`tel:${order.userPhone}`} className="font-semibold text-pink-600 hover:text-pink-700">
                                {order.userPhone}
                              </a>
                            </div>
                          </div>
                        )}
                        {order.userEmail && (
                          <div className="flex items-start gap-2">
                            <Mail className="text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="font-semibold break-all">{order.userEmail}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                          <div>
                            <p className="text-xs text-gray-500">Address</p>
                            <p className="font-semibold">{order.deliveryAddress}</p>
                            {order.customerInfo.city && (
                              <p className="text-xs text-gray-600">{order.customerInfo.city}, {order.customerInfo.pincode}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Calendar size={18} className="text-pink-600" />
                        Delivery Details
                      </h4>
                      <div className="space-y-2 text-sm bg-white rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date</span>
                          <span className="font-semibold">
                            {new Date(order.deliveryDate).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time</span>
                          <span className="font-semibold">
                            {order.deliveryTime === 'morning' ? '9 AM - 12 PM' : 
                             order.deliveryTime === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment</span>
                          <span className="font-semibold uppercase">{order.paymentMethod}</span>
                        </div>
                        {order.source && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Source</span>
                            <span className="font-semibold capitalize">{order.source}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gift Info */}
                  {order.isGift && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Gift size={18} className="text-purple-600" />
                        Gift Information
                      </h4>
                      <div className="bg-purple-50 rounded-lg p-3 space-y-2 text-sm border border-purple-200">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Recipient</span>
                          <span className="font-semibold">{order.recipientName}</span>
                        </div>
                        {order.occasionType && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Occasion</span>
                            <span className="font-semibold capitalize">{order.occasionType}</span>
                          </div>
                        )}
                        {order.giftMessage && (
                          <div className="pt-2 border-t border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Gift Message</p>
                            <p className="italic text-gray-800">&quot;{order.giftMessage}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Special Instructions */}
                  {(order.specialInstructions || order.orderNote) && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        Notes & Instructions
                      </h4>
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm border border-blue-200">
                        {order.specialInstructions && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Special Instructions</p>
                            <p className="text-gray-800">{order.specialInstructions}</p>
                          </div>
                        )}
                        {order.orderNote && (
                          <div className={order.specialInstructions ? 'pt-2 border-t border-blue-200' : ''}>
                            <p className="text-xs text-gray-600 mb-1">Order Note</p>
                            <p className="text-gray-800">{order.orderNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <DollarSign size={18} className="text-green-600" />
                      Payment Breakdown
                    </h4>
                    <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
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
                          <span className="flex items-center gap-1">
                            <Percent size={14} />
                            Discount {order.promoCode && `(${order.promoCode})`}
                          </span>
                          <span className="font-semibold">-₹{order.discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-gray-200 pt-2">
                        <span className="font-bold text-base">Total</span>
                        <span className="font-bold text-lg text-pink-600">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">Update Order Status</h4>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      disabled={updating === order.id}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    {updating === order.id && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <Loader2 className="animate-spin" size={12} />
                        Updating status...
                      </p>
                    )}
                  </div>

                  {/* ✅ FIXED: Contact Actions with proper WhatsApp link */}
                  <div className="flex gap-2">
                    {order.userPhone && (
                      <>
                        <a
                          href={`tel:${order.userPhone}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                        >
                          <Phone size={18} />
                          Call Customer
                        </a>
                        <a
                          href={`https://wa.me/${order.userPhone.replace(/[^0-9]/g, '')}?text=${generateWhatsAppMessage(order)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                          <MessageCircle size={18} />
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
