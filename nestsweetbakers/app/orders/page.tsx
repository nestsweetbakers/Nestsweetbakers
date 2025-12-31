'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useRouter } from 'next/navigation';
import { 
  Package, Clock, CheckCircle, XCircle, Loader2, Truck, Calendar, 
  Phone, MessageCircle, Mail, MapPin, User, Edit2, Save, X as CloseIcon,
  Search, Filter, Download, Star, RefreshCw, Eye, AlertCircle,
  ChevronDown, ChevronUp, TrendingUp, DollarSign, ShoppingBag,
  Heart, Share2, Copy, Check
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';

interface UserProfile {
  name: string;
  displayName?: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  lastUpdated?: any;
}

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

interface Order {
  id: string;
  orderRef?: string;
  cakeName?: string; // Legacy field
  cakeImage?: string; // Legacy field
  items?: OrderItem[]; // New structure
  quantity?: number; // Legacy field
  totalPrice?: number; // Legacy field
  total?: number; // New field
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  customerName?: string;
  userName?: string;
  customerPhone?: string;
  userPhone?: string;
  customerEmail?: string;
  userEmail?: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime?: string;
  customization?: string;
  specialInstructions?: string;
  createdAt: any;
  updatedAt?: any;
  rating?: number;
  review?: string;
  trackingSteps?: {
    placed: boolean;
    confirmed: boolean;
    preparing: boolean;
    outForDelivery: boolean;
    delivered: boolean;
  };
}

interface CustomRequest {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
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
  createdAt: any;
  adminNotes?: string;
  quotedPrice?: number;
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, currencySymbol } = useSettings();
  const { showSuccess, showError, showInfo } = useToast();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'custom'>('orders');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch user profile from multiple sources
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      // Try userProfiles collection first
      let profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
      let profileData: any = null;

      if (profileDoc.exists()) {
        profileData = profileDoc.data();
      } else {
        // Fallback to users collection
        profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          profileData = profileDoc.data();
        }
      }

      if (profileData) {
        const data = profileData as UserProfile;
        setUserProfile(data);
        setProfileData({
          name: data.name || data.displayName || user.displayName || '',
          phone: data.phone || '',
          email: data.email || user.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
        });
      } else {
        // No profile exists, initialize from auth
        setProfileData({
          name: user.displayName || '',
          phone: '',
          email: user.email || '',
          address: '',
          city: '',
          state: '',
          pincode: '',
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showError('Failed to load profile');
    }
  }, [user, showError]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Order;
      });

      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.code !== 'failed-precondition') {
        showError('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  const fetchCustomRequests = useCallback(async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'customRequests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      } as CustomRequest));

      setCustomRequests(requestsData);
    } catch (error: any) {
      console.error('Error fetching custom requests:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchOrders();
      fetchCustomRequests();
    }
  }, [user, fetchUserProfile, fetchOrders, fetchCustomRequests]);

  // Save profile to multiple locations and sync
  const handleSaveProfile = async () => {
    if (!user) return;

    if (!profileData.name || !profileData.phone) {
      showError('Name and phone are required');
      return;
    }

    setSavingProfile(true);
    try {
      const updateData = {
        name: profileData.name,
        displayName: profileData.name,
        phone: profileData.phone,
        email: profileData.email || user.email || '',
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        pincode: profileData.pincode,
        lastUpdated: new Date(),
      };

      // Update userProfiles collection (primary)
      await setDoc(doc(db, 'userProfiles', user.uid), updateData, { merge: true });

      // Update users collection (backup/legacy)
      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.name,
        });
      }

      // Update all existing orders with new customer info
      const ordersToUpdate = orders.filter(o => 
        o.customerName !== profileData.name || 
        o.customerPhone !== profileData.phone ||
        o.userName !== profileData.name ||
        o.userPhone !== profileData.phone
      );

      if (ordersToUpdate.length > 0) {
        const updatePromises = ordersToUpdate.map(order => 
          updateDoc(doc(db, 'orders', order.id), {
            customerName: profileData.name,
            userName: profileData.name,
            customerPhone: profileData.phone,
            userPhone: profileData.phone,
            customerEmail: profileData.email,
            userEmail: profileData.email,
          }).catch(err => console.error('Error updating order:', err))
        );
        await Promise.all(updatePromises);
        
        // Refresh orders to show updated info
        await fetchOrders();
      }

      // Update custom requests
      const requestsToUpdate = customRequests.filter(r => 
        r.name !== profileData.name || r.phone !== profileData.phone
      );

      if (requestsToUpdate.length > 0) {
        const updatePromises = requestsToUpdate.map(request => 
          updateDoc(doc(db, 'customRequests', request.id), {
            name: profileData.name,
            phone: profileData.phone,
            email: profileData.email,
          }).catch(err => console.error('Error updating request:', err))
        );
        await Promise.all(updatePromises);
        
        // Refresh requests
        await fetchCustomRequests();
      }

      setUserProfile(updateData as UserProfile);
      setEditingProfile(false);
      showSuccess('✅ Profile updated successfully across all orders!');
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('❌ Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: new Date(),
      });
      showSuccess('✅ Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      showError('❌ Failed to cancel order');
    }
  };

  const handleReorder = (order: Order) => {
    // Navigate to cakes page
    router.push('/cakes');
    showInfo('Browse our cakes to place a new order!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('📋 Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-600" size={20} />;
      case 'processing':
        return <Truck className="text-blue-600" size={20} />;
      case 'completed':
      case 'approved':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Package className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get order display data (handles both old and new structure)
  const getOrderDisplay = (order: Order) => {
    if (order.items && order.items.length > 0) {
      // New structure with items array
      return {
        name: order.items[0]?.cakeName || 'Custom Order',
        image: order.items[0]?.cakeImage,
        quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: order.total || 0,
        customerName: order.userName || order.customerName || 'N/A',
        customerPhone: order.userPhone || order.customerPhone || 'N/A',
        customerEmail: order.userEmail || order.customerEmail || '',
        itemCount: order.items.length,
      };
    } else {
      // Legacy structure
      return {
        name: order.cakeName || 'Order',
        image: order.cakeImage,
        quantity: order.quantity || 1,
        total: order.totalPrice || order.total || 0,
        customerName: order.userName || order.customerName || 'N/A',
        customerPhone: order.userPhone || order.customerPhone || 'N/A',
        customerEmail: order.userEmail || order.customerEmail || '',
        itemCount: 1,
      };
    }
  };

  const filteredOrders = orders.filter(order => {
    const display = getOrderDisplay(order);
    const matchesSearch = display.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order.orderRef || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredCustomRequests = customRequests.filter(request => {
    const matchesSearch = request.occasion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.flavor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Statistics
  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status === 'pending').length,
    totalSpent: orders.reduce((sum, o) => {
      const display = getOrderDisplay(o);
      return sum + display.total;
    }, 0),
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header with Profile */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Card */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="text-pink-600" size={24} />
                    My Profile
                  </h2>
                  {!editingProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Edit Profile"
                    >
                      <Edit2 size={18} className="text-gray-600" />
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="Phone *"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder="Address"
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={profileData.city}
                        onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={profileData.pincode}
                        onChange={(e) => setProfileData({...profileData, pincode: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-pink-700 hover:to-purple-700 transition disabled:opacity-50"
                      >
                        {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileData({
                            name: userProfile?.name || user.displayName || '',
                            phone: userProfile?.phone || '',
                            email: userProfile?.email || user.email || '',
                            address: userProfile?.address || '',
                            city: userProfile?.city || '',
                            state: userProfile?.state || '',
                            pincode: userProfile?.pincode || '',
                          });
                        }}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        <CloseIcon size={18} />
                      </button>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 flex items-center gap-2">
                        <AlertCircle size={14} />
                        Changes will sync across all your orders
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-semibold">{profileData.name || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-semibold">{profileData.phone || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-semibold text-sm break-all">{profileData.email || 'Not set'}</p>
                      </div>
                    </div>
                    {profileData.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                        <div>
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="font-semibold text-sm">{profileData.address}</p>
                          {profileData.city && (
                            <p className="text-xs text-gray-600 mt-1">{profileData.city} {profileData.pincode}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!userProfile && !editingProfile && (
                  <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Complete your profile for faster checkout
                    </p>
                  </div>
                )}

                {/* Quick Contact */}
                {settings.phone && (
                  <div className="mt-6 pt-6 border-t space-y-2">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Need Help?</p>
                    <a
                      href={`tel:${settings.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-pink-600 transition"
                    >
                      <Phone size={16} />
                      {settings.phone}
                    </a>
                    {settings.whatsapp && (
                      <a
                        href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600 transition"
                      >
                        <MessageCircle size={16} />
                        WhatsApp Support
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="lg:w-2/3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingBag className="text-blue-600" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-xs text-gray-600 font-medium">Total Orders</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  <p className="text-xs text-gray-600 font-medium">Completed</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="text-yellow-600" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-gray-600 font-medium">Pending</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="text-purple-600" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{currencySymbol}{stats.totalSpent.toFixed(0)}</p>
                  <p className="text-xs text-gray-600 font-medium">Total Spent</p>
                </div>
              </div>

              {/* Page Title */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  My Orders
                </h1>
                <p className="text-gray-600">Track your cake orders and custom requests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto scrollbar-hide animate-fade-in" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package size={20} />
            Orders ({filteredOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar size={20} />
            Custom Requests ({filteredCustomRequests.length})
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="text-pink-600" size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {searchQuery || filterStatus !== 'all' ? 'No matching orders' : 'No orders yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Start ordering delicious cakes today!'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <Link
                    href="/cakes"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg"
                  >
                    <ShoppingBag size={20} />
                    Browse Cakes
                  </Link>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const display = getOrderDisplay(order);
                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Order Image */}
                        {display.image && (
                          <div className="w-full lg:w-40 h-40 flex-shrink-0 relative rounded-xl overflow-hidden border-4 border-gray-100">
                            <Image
                              src={display.image}
                              alt={display.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 160px"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div>
                              <h3 className="text-2xl font-bold mb-2">{display.name}</h3>
                              {display.itemCount > 1 && (
                                <p className="text-sm text-gray-600 mb-1">+{display.itemCount - 1} more items</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <button
                                  onClick={() => copyToClipboard(order.orderRef || order.id)}
                                  className="flex items-center gap-1 hover:text-pink-600 transition"
                                >
                                  {order.orderRef ? `Order #${order.orderRef}` : `Order #${order.id.slice(0, 8)}`}
                                  {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <span>•</span>
                                <span>{order.createdAt.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}</span>
                              </div>
                            </div>

                            <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Quantity</p>
                              <p className="font-bold text-lg">{display.quantity} kg</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Total</p>
                              <p className="font-bold text-lg text-pink-600">{currencySymbol}{display.total.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Delivery Date</p>
                              <p className="font-bold">{new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Contact</p>
                              <p className="font-bold text-sm">{display.customerPhone}</p>
                            </div>
                          </div>

                          {/* Expandable Details */}
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="flex items-center gap-2 text-pink-600 font-semibold hover:text-pink-700 transition mb-4"
                          >
                            {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                          </button>

                          {expandedOrder === order.id && (
                            <div className="space-y-4 mb-4 animate-fade-in">
                              {(order.customization || order.specialInstructions) && (
                                <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                                  <p className="text-sm font-semibold text-gray-700 mb-1">Special Instructions:</p>
                                  <p className="text-gray-700">{order.customization || order.specialInstructions}</p>
                                </div>
                              )}

                              {order.deliveryAddress && (
                                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                                  <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <MapPin size={16} />
                                    Delivery Address:
                                  </p>
                                  <p className="text-gray-700">{order.deliveryAddress}</p>
                                </div>
                              )}

                              {/* Show all items if multiple */}
                              {order.items && order.items.length > 1 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <p className="text-sm font-semibold text-gray-700 mb-3">Order Items ({order.items.length}):</p>
                                  <div className="space-y-2">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.cakeName} - {item.weight}</span>
                                        <span className="font-semibold">{currencySymbol}{item.totalPrice}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-3">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-semibold"
                              >
                                <XCircle size={18} />
                                Cancel Order
                              </button>
                            )}
                            
                            {order.status === 'completed' && (
                              <button
                                onClick={() => handleReorder(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
                              >
                                <RefreshCw size={18} />
                                Order Again
                              </button>
                            )}

                            {settings.phone && (
                              <a
                                href={`tel:${settings.phone}`}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
                              >
                                <Phone size={18} />
                                Call Support
                              </a>
                            )}

                            {settings.whatsapp && (
                              <a
                                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}?text=Hi, I have a question about my order %23${order.orderRef || order.id.slice(0, 8)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 border-2 border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition font-semibold"
                              >
                                <MessageCircle size={18} />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tracking Timeline */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center ${order.status !== 'cancelled' ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle size={20} className="mb-1" />
                          <span className="text-xs font-semibold">Placed</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 ${order.status === 'processing' || order.status === 'completed' ? 'bg-gradient-to-r from-green-600 to-blue-600' : 'bg-gray-300'}`}></div>
                        <div className={`flex flex-col items-center ${order.status === 'processing' || order.status === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>
                          <Truck size={20} className="mb-1" />
                          <span className="text-xs font-semibold">Processing</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 ${order.status === 'completed' ? 'bg-gradient-to-r from-blue-600 to-green-600' : 'bg-gray-300'}`}></div>
                        <div className={`flex flex-col items-center ${order.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle size={20} className="mb-1" />
                          <span className="text-xs font-semibold">Delivered</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Custom Requests Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6 animate-fade-in">
            {filteredCustomRequests.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="text-purple-600" size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {searchQuery || filterStatus !== 'all' ? 'No matching requests' : 'No custom requests yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Design your dream cake with us!'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <Link
                    href="/custom-cakes"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg"
                  >
                    <Calendar size={20} />
                    Request Custom Cake
                  </Link>
                )}
              </div>
            ) : (
              filteredCustomRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{request.occasion} Cake</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <button
                            onClick={() => copyToClipboard(request.id)}
                            className="flex items-center gap-1 hover:text-pink-600 transition"
                          >
                            Request #{request.id.slice(0, 8)}
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <span>•</span>
                          <span>{request.createdAt.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 font-semibold whitespace-nowrap ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Flavor</p>
                        <p className="font-bold">{request.flavor}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Size</p>
                        <p className="font-bold">{request.size}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Budget</p>
                        <p className="font-bold text-pink-600">{currencySymbol}{request.budget}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Delivery</p>
                        <p className="font-bold">{new Date(request.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>

                    {/* Design Description */}
                    <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Design Description:</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{request.design}</p>
                    </div>

                    {/* Admin Notes */}
                    {request.adminNotes && (
                      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <AlertCircle size={16} />
                          Admin Response:
                        </p>
                        <p className="text-gray-700">{request.adminNotes}</p>
                        {request.quotedPrice && (
                          <p className="mt-2 font-bold text-green-600">
                            Quoted Price: {currencySymbol}{request.quotedPrice}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reference Images */}
                    {request.referenceImages && request.referenceImages.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Reference Images ({request.referenceImages.length}):</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                          {request.referenceImages.map((url, idx) => (
                            <div key={idx} className="relative h-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-pink-400 transition">
                              <Image
                                src={url}
                                alt={`Reference ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="150px"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      {settings.phone && (
                        <a
                          href={`tel:${settings.phone}`}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition font-semibold"
                        >
                          <Phone size={18} />
                          Call Us
                        </a>
                      )}

                      {settings.whatsapp && (
                        <a
                          href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}?text=Hi, I have a question about my custom cake request %23${request.id.slice(0, 8)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
                        >
                          <MessageCircle size={18} />
                          WhatsApp Us
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status Message */}
                  {request.status === 'pending' && (
                    <div className="bg-yellow-50 px-6 py-4 flex items-center gap-3 text-yellow-800">
                      <Clock size={20} />
                      <span className="font-semibold">Our team will review your request and contact you within 24 hours!</span>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <div className="bg-green-50 px-6 py-4 flex items-center gap-3 text-green-800">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Your custom cake request has been approved! We&apos;ll start preparing soon.</span>
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="bg-red-50 px-6 py-4 flex items-center gap-3 text-red-800">
                      <XCircle size={20} />
                      <span className="font-semibold">Unfortunately, we couldn&apos;t proceed with this request. Please contact us for alternatives.</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
