'use client';

import { useState, useEffect, Suspense } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Package, Search, Clock, CheckCircle, XCircle, Truck, 
  Phone, Mail, MapPin, Calendar, Loader2, AlertCircle,
  Eye, Gift, FileText, DollarSign, ArrowLeft, LogIn
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Order {
  id: string;
  orderRef: string;
  isGuest?: boolean;
  userName: string;
  userEmail?: string;
  userPhone: string;
  items: any[];
  deliveryDate: string;
  deliveryAddress: string;
  total: number;
  status: string;
  trackingSteps: {
    placed: boolean;
    confirmed: boolean;
    preparing: boolean;
    outForDelivery: boolean;
    delivered: boolean;
  };
  createdAt: any;
}

function TrackOrderContent() {
  const [orderRef, setOrderRef] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-search if ref in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setOrderRef(ref);
      handleTrackOrder(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTrackOrder = async (refFromUrl?: string) => {
    const searchRef = refFromUrl || orderRef;
    
    if (!searchRef.trim()) {
      showError('Please enter your order ID');
      return;
    }

    setSearching(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('orderRef', '==', searchRef.toUpperCase()),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showError('Order not found. Please check your Order ID.');
        setOrder(null);
        return;
      }

      const orderData = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
        createdAt: snapshot.docs[0].data().createdAt?.toDate?.() || new Date(),
      } as Order;

      // For guest orders, optionally verify phone
      if (orderData.isGuest && phone && orderData.userPhone !== phone) {
        showError('Phone number does not match order records');
        return;
      }

      setOrder(orderData);
      showSuccess('Order found!');
    } catch (error) {
      console.error('Error tracking order:', error);
      showError('Failed to track order. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const getTrackingStatus = () => {
    if (!order) return [];
    
    const steps = [
      { key: 'placed', label: 'Order Placed', icon: CheckCircle, color: 'green' },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'green' },
      { key: 'preparing', label: 'Preparing', icon: Package, color: 'blue' },
      { key: 'outForDelivery', label: 'Out for Delivery', icon: Truck, color: 'purple' },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'green' },
    ];

    return steps.map(step => ({
      ...step,
      completed: order.trackingSteps[step.key as keyof typeof order.trackingSteps],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="text-pink-600" size={48} />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Track Your Order
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Enter your Order ID to check your order status
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order ID / Reference Number *
              </label>
              <input
                type="text"
                placeholder="e.g., ORDMJU123ABC"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase"
                disabled={searching}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number (Optional for verification)
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={searching}
              />
            </div>

            <button
              onClick={() => handleTrackOrder()}
              disabled={searching || !orderRef}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
            >
              {searching ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Track Order
                </>
              )}
            </button>
          </div>

          {/* If user is logged in */}
          {user && (
            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 text-center">
                You&apos;re logged in! <Link href="/orders" className="font-bold underline">View all your orders</Link>
              </p>
            </div>
          )}

          {/* If guest */}
          {!user && (
            <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <p className="text-sm text-purple-800 text-center">
                <LogIn className="inline mr-2" size={16} />
                <Link href="/login" className="font-bold underline">Sign in</Link> to view all your orders
              </p>
            </div>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Status */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Order #{order.orderRef}</h2>
                  <p className="text-sm text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Tracking Steps */}
              <div className="space-y-4">
                {getTrackingStatus().map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? `bg-${step.color}-100 text-${step.color}-600`
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                      {step.completed && (
                        <CheckCircle className="text-green-600" size={20} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
              <h3 className="font-bold text-xl mb-4">Order Items ({order.items.length})</h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-gray-50 rounded-xl p-4">
                    {item.cakeImage && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={item.cakeImage} alt={item.cakeName} fill className="object-cover" sizes="80px" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{item.cakeName}</p>
                      <p className="text-sm text-gray-600">{item.weight} • ₹{item.totalPrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
              <h3 className="font-bold text-xl mb-4">Delivery Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-gray-600">Delivery Date</p>
                    <p className="font-semibold">{new Date(order.deliveryDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-gray-600">Delivery Address</p>
                    <p className="font-semibold">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-gray-600">Contact</p>
                    <p className="font-semibold">{order.userPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl shadow-lg p-6 md:p-8 text-white text-center">
              <p className="text-lg mb-2">Total Amount</p>
              <p className="text-4xl font-bold">₹{order.total.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-pink-600" size={48} />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
