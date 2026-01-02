'use client';

import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trash2, Plus, Minus, ShoppingBag, MessageCircle, Loader2, 
  CheckCircle, AlertCircle, Truck, User, Phone, Mail, MapPin,
  Calendar, Edit2, Save, Package, ArrowRight, Shield,
  CreditCard, Clock, Gift, Percent, Info, Copy, Check,
  X, Sparkles, FileText, Zap, LogIn
} from 'lucide-react';
type PromoConfig = {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  active?: boolean;
};
interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  occasionType: string;
  recipientName: string;
  giftMessage: string;
}

interface ExtendedSettings {
  businessName?: string;
  phone?: string;
  whatsapp?: string;
  businessHours?: string;
  freeDeliveryAbove?: number;
  deliveryFee?: number;
  taxRate?: number;
  enableCOD?: boolean;
  enableOnlinePayment?: boolean;
   allowedPincodes?: string;             // e.g. "133001,133002,133003"
  promoCodes?: PromoConfig[];           // configured by admin in settings
  [key: string]: any;
}

export default function CartPage() {
  const { cart, cartCount, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const { settings: rawSettings, currencySymbol } = useSettings();
  const { showSuccess, showError, showInfo } = useToast();
  const router = useRouter();

  const settings = rawSettings as ExtendedSettings;
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    deliveryDate: '',
    deliveryTime: 'morning',
    specialInstructions: '',
    occasionType: '',
    recipientName: '',
    giftMessage: '',
  });

  const [isEditingInfo, setIsEditingInfo] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'online' | 'cod'>('whatsapp');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [copied, setCopied] = useState(false);
const allowedPincodes =
  (settings.allowedPincodes || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

const availablePromos: PromoConfig[] = Array.isArray(settings.promoCodes)
  ? (settings.promoCodes as PromoConfig[])
  : [];
  
  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      setIsEditingInfo(true);
      return;
    }

    try {
      let userDoc = await getDoc(doc(db, 'userProfiles', user.uid));
      
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      }

      if (userDoc.exists()) {
        const data = userDoc.data();
        const hasCompleteProfile = data.address && data.phone && data.pincode;
        
        setCustomerInfo(prev => ({
          ...prev,
          name: data.displayName || data.name || user.displayName || '',
          phone: data.phone || '',
          email: data.email || user.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
        }));

        setIsEditingInfo(!hasCompleteProfile);
      } else {
        setCustomerInfo(prev => ({
          ...prev,
          name: user.displayName || '',
          email: user.email || '',
        }));
        setIsEditingInfo(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Failed to load profile. Please enter your details manually.');
    } finally {
      setLoadingProfile(false);
    }
  }, [user, showError]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const deliveryFee = totalPrice >= (settings.freeDeliveryAbove || 1000) ? 0 : (settings.deliveryFee || 50);
  const tax = (totalPrice * (settings.taxRate || 0)) / 100;
  const packagingFee = cart.length * 10;
  const finalTotal = totalPrice + deliveryFee + tax + packagingFee - discount;

  const validateForm = (): boolean => {
  if (!customerInfo.name.trim()) {
    showError('Please enter your name');
    return false;
  }
  if (!customerInfo.phone.trim() || customerInfo.phone.length < 10) {
    showError('Please enter a valid phone number');
    return false;
  }
  if (!customerInfo.address.trim()) {
    showError('Please enter delivery address');
    return false;
  }
  if (!customerInfo.pincode.trim()) {
    showError('Please enter pincode');
    return false;
  }

  // ✅ Block if pincode is not in allowed list
  const pin = customerInfo.pincode.trim();
  if (allowedPincodes.length > 0 && !allowedPincodes.includes(pin)) {
    showError('Sorry, delivery is not available for this pincode. Please enter a serviceable pincode.');
    return false;
  }

  if (!customerInfo.deliveryDate) {
    showError('Please select delivery date');
    return false;
  }
  if (!acceptTerms) {
    showError('Please accept terms and conditions');
    return false;
  }

  const selectedDate = new Date(customerInfo.deliveryDate);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  minDate.setHours(0, 0, 0, 0);

  if (selectedDate < minDate) {
    showError('Minimum 2 days advance order required');
    return false;
  }

  return true;
};


  const applyPromoCode = () => {
  if (!promoCode.trim()) {
    showError('Please enter a promo code');
    return;
  }

  if (availablePromos.length === 0) {
    showInfo('No active promo codes available right now.');
    return;
  }

  const code = promoCode.toUpperCase();
  const promo = availablePromos.find(
    p => p.code.toUpperCase() === code && p.active !== false
  );

  if (!promo) {
    showError('Invalid or expired promo code');
    return;
  }

  if (totalPrice < promo.minOrder) {
    showError(`Minimum order of ${currencySymbol}${promo.minOrder} required for this promo`);
    return;
  }

  const discountValue =
    promo.type === 'percentage'
      ? (totalPrice * promo.value) / 100
      : promo.value;

  setDiscount(discountValue);
  setAppliedPromo(code);
  showSuccess(`🎉 Promo code applied! You saved ${currencySymbol}${discountValue.toFixed(2)}`);
  setShowPromo(false);
};


  const removePromo = () => {
    setDiscount(0);
    setAppliedPromo('');
    setPromoCode('');
    showInfo('Promo code removed');
  };

  const generateOrderRef = () => {
    return 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
  };

  // ✅ MAIN ORDER SUBMISSION HANDLER
  const handlePlaceOrder = async () => {
  if (!validateForm()) return;

  setSubmitting(true);

  try {
    const orderRef = generateOrderRef();
    const isGuest = !user;
    
    const orderData = {
      orderRef,
      isGuest,
      userId: user?.uid || null,
      userEmail: user?.email || customerInfo.email || null,
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email || user?.email || '',
        address: customerInfo.address,
        city: customerInfo.city,
        state: customerInfo.state,
        pincode: customerInfo.pincode,
      },
      items: cart.map(item => ({
        cakeId: item.id,
        cakeName: item.name,
        cakeImage: item.imageUrl,
        quantity: item.quantity,
        weight: `${item.quantity}kg`,
        basePrice: item.basePrice,
        totalPrice: item.basePrice * item.quantity,
        customization: item.customization || '',
        category: item.category || '',
        flavor: item.flavor || '',
      })),
      deliveryDate: customerInfo.deliveryDate,
      deliveryTime: customerInfo.deliveryTime,
      isGift: !!customerInfo.recipientName,
      recipientName: customerInfo.recipientName,
      giftMessage: customerInfo.giftMessage,
      occasionType: customerInfo.occasionType,
      specialInstructions: customerInfo.specialInstructions,
      orderNote: orderNote,
      subtotal: totalPrice,
      deliveryFee,
      packagingFee,
      tax,
      discount,
      promoCode: appliedPromo,
      total: finalTotal,
      paymentMethod,
    };

    // ✅ Call API route for order submission with proper error handling
    const response = await fetch('/api/orders/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderData),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned invalid response. Please try again.');
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to place order');
    }

    clearCart();
    
    // ✅ Store order reference in localStorage for guest users
    if (isGuest) {
      const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
      guestOrders.push({
        orderRef,
        orderId: result.orderId,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        timestamp: Date.now(),
      });
      localStorage.setItem('guestOrders', JSON.stringify(guestOrders));
    }

    showSuccess('🎉 Order placed successfully!');

    // ✅ ALWAYS open WhatsApp for ALL users (logged-in + guest)
    if (result.whatsappUrl) {
      showInfo('Opening WhatsApp to send order details...');
      
      // Open WhatsApp after a short delay
      setTimeout(() => {
        window.open(result.whatsappUrl, '_blank');
      }, 1000);
    }

    // ✅ Redirect to confirmation page
    setTimeout(() => {
      router.push(`/order-confirmation/${result.orderId}?ref=${orderRef}`);
    }, 2000);

  } catch (error: any) {
    console.error('Error placing order:', error);
    showError(error.message || 'Failed to place order. Please try again.');
  } finally {
    setSubmitting(false);
  }
};


  const copyOrderSummary = () => {
    const summary = cart.map(item => 
      `${item.name} - ${item.quantity}kg - ${currencySymbol}${item.basePrice * item.quantity}`
    ).join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    showSuccess('Order summary copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveInfo = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address || !customerInfo.pincode) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      if (user) {
        await setDoc(doc(db, 'userProfiles', user.uid), {
          displayName: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || user.email || '',
          address: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state,
          pincode: customerInfo.pincode,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        showSuccess('Profile saved successfully!');
      }
      setIsEditingInfo(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile. Please try again.');
      setIsEditingInfo(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md animate-scale-in">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="text-pink-600" size={40} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Your Cart is Empty
          </h1>
          <p className="text-gray-600 mb-8">Discover our delicious collection of cakes!</p>
          <Link 
            href="/cakes" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg transform hover:scale-105"
          >
            <ShoppingBag size={20} />
            Browse Cakes
          </Link>
        </div>
      </div>
    );
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-6 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Shopping Cart
              </h1>
              <p className="text-gray-600 flex items-center gap-2 text-sm md:text-base">
                <Package size={18} />
                {cartCount} {cartCount === 1 ? 'item' : 'items'} • Total: {currencySymbol}{totalPrice.toFixed(2)}
              </p>
            </div>
            
            <button
              onClick={copyOrderSummary}
              className="hidden sm:flex items-center gap-2 px-4 py-2 border-2 border-pink-300 text-pink-600 rounded-xl hover:bg-pink-50 transition font-semibold shadow-sm hover:shadow-md"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span className="hidden md:inline">Copy Summary</span>
            </button>
          </div>

          {/* ✅ Guest User Banner */}
          {!user && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl md:rounded-2xl p-4 md:p-5 text-white shadow-lg mb-4">
              <div className="flex items-start gap-3">
                <Info className="flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-base md:text-lg mb-2 flex items-center gap-2">
                    Checkout as Guest or Sign In
                  </h3>
                  <p className="text-xs md:text-sm opacity-90 mb-3">
                    You can place your order without signing in. Save your order reference to track later, or sign in to manage all your orders in one place!
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-semibold text-sm shadow-md"
                  >
                    <LogIn size={16} />
                    Sign In to Your Account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar for Free Delivery */}
          {totalPrice < (settings.freeDeliveryAbove || 1000) && (
            <div className="bg-white rounded-xl md:rounded-2xl p-4 shadow-lg border border-pink-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs md:text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Sparkles size={16} className="text-pink-600" />
                  Add {currencySymbol}{((settings.freeDeliveryAbove || 1000) - totalPrice).toFixed(2)} more for FREE delivery!
                </span>
                <Truck className="text-green-600" size={20} />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 md:h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalPrice / (settings.freeDeliveryAbove || 1000)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            {cart.map((item, index) => (
              <div 
                key={`${item.id}-${item.customization}`} 
                className="bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transition-all animate-slide-in p-4 md:p-6 border border-gray-100"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-3 md:gap-4">
                  <div className="relative w-20 h-20 md:w-28 md:h-28 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden border-2 md:border-4 border-gray-100 group">
                    <Image
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300'}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 80px, 112px"
                    />
                    {item.category && (
                      <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-pink-600 text-white text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-semibold shadow-lg">
                        {item.category}
                      </div>
                    )}
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-2">
                        <h3 className="font-bold text-base md:text-lg lg:text-xl mb-1 line-clamp-2">{item.name}</h3>
                        {item.flavor && (
                          <p className="text-xs md:text-sm text-gray-600 mb-1">Flavor: {item.flavor}</p>
                        )}
                        {item.customization && (
                          <div className="bg-purple-50 rounded-lg px-2 md:px-3 py-1.5 md:py-2 mt-2 border border-purple-200">
                            <p className="text-xs md:text-sm text-purple-800 flex items-start gap-1.5">
                              <Info size={14} className="flex-shrink-0 mt-0.5" />
                              <span className="font-medium line-clamp-2">{item.customization}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id!)}
                        className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-lg transition group flex-shrink-0"
                        title="Remove item"
                      >
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-pink-600 font-bold text-lg md:text-xl">{currencySymbol}{item.basePrice}</p>
                          <p className="text-xs text-gray-500">per kg</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3 justify-between sm:justify-end">
                        <div className="flex items-center gap-1.5 md:gap-2 bg-gray-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.id!, Math.max(0.5, item.quantity - 0.5))}
                            className="text-gray-600 hover:text-pink-600 transition p-1"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-bold w-10 md:w-12 text-center text-sm md:text-base">{item.quantity}kg</span>
                          <button
                            onClick={() => updateQuantity(item.id!, item.quantity + 0.5)}
                            className="text-gray-600 hover:text-pink-600 transition p-1"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-lg md:text-xl text-pink-600">{currencySymbol}{(item.basePrice * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-2 hover:gap-3 transition-all text-sm md:text-base"
              >
                <Trash2 size={18} />
                Clear Cart
              </button>
              
              <Link
                href="/cakes"
                className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-2 hover:gap-3 transition-all text-sm md:text-base"
              >
                Add More Items
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Checkout Section - CONTINUES IN NEXT MESSAGE... */}
          <div className="space-y-4 md:space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {/* Customer Information Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <User className="text-pink-600" size={20} />
                  Contact Details
                </h2>
                {!isEditingInfo && (
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Edit information"
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                )}
              </div>

              {isEditingInfo ? (
                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone *"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                      required
                    />
                  </div>
                  
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                  />
                  
                  <textarea
                    placeholder="Delivery Address *"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-sm md:text-base"
                    rows={3}
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                    />
                    <input
                      type="text"
                      placeholder="Pincode *"
                      value={customerInfo.pincode}
                      onChange={(e) => setCustomerInfo({...customerInfo, pincode: e.target.value})}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                      required
                    />
                  </div>
                  
                  <button
                    onClick={handleSaveInfo}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2.5 md:py-3 rounded-lg md:rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition shadow-md text-sm md:text-base"
                  >
                    <Save size={18} />
                    Save Contact Details
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <User className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-semibold">{customerInfo.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-semibold">{customerInfo.phone}</p>
                    </div>
                  </div>
                  {customerInfo.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-semibold break-all">{customerInfo.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-semibold">{customerInfo.address}</p>
                      {customerInfo.city && <p className="text-xs text-gray-600">{customerInfo.city}, {customerInfo.pincode}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Details Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-4">
                <Calendar className="text-pink-600" size={20} />
                Delivery Schedule
              </h2>
              
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Date *</label>
                  <input
                    type="date"
                    value={customerInfo.deliveryDate}
                    onChange={(e) => setCustomerInfo({...customerInfo, deliveryDate: e.target.value})}
                    min={minDateString}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Info size={12} />
                    Minimum 2 days advance order required
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Time *</label>
                  <select
                    value={customerInfo.deliveryTime}
                    onChange={(e) => setCustomerInfo({...customerInfo, deliveryTime: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base"
                  >
                    <option value="morning">🌅 Morning (9 AM - 12 PM)</option>
                    <option value="afternoon">☀️ Afternoon (12 PM - 4 PM)</option>
                    <option value="evening">🌆 Evening (4 PM - 8 PM)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gift Options Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!customerInfo.recipientName}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setCustomerInfo({...customerInfo, recipientName: '', giftMessage: '', occasionType: ''});
                    } else {
                      setCustomerInfo({...customerInfo, recipientName: ' '});
                    }
                  }}
                  className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <Gift size={20} className="text-pink-600" />
                <span className="font-bold text-lg md:text-xl group-hover:text-pink-600 transition">This is a Gift 🎁</span>
              </label>

              {customerInfo.recipientName && (
                <div className="space-y-3 md:space-y-4 animate-fade-in pt-3 border-t">
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={customerInfo.recipientName.trim()}
                    onChange={(e) => setCustomerInfo({...customerInfo, recipientName: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 text-sm md:text-base"
                  />
                  
                  <select
                    value={customerInfo.occasionType}
                    onChange={(e) => setCustomerInfo({...customerInfo, occasionType: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 text-sm md:text-base"
                  >
                    <option value="">Select Occasion</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💝 Anniversary</option>
                    <option value="congratulations">🎉 Congratulations</option>
                    <option value="thank-you">🙏 Thank You</option>
                    <option value="wedding">💍 Wedding</option>
                    <option value="baby-shower">👶 Baby Shower</option>
                    <option value="other">🎁 Other</option>
                  </select>
                  
                  <textarea
                    placeholder="Gift Message (Optional)"
                    value={customerInfo.giftMessage}
                    onChange={(e) => setCustomerInfo({...customerInfo, giftMessage: e.target.value})}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 resize-none text-sm md:text-base"
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 text-right">{customerInfo.giftMessage.length}/200</p>
                </div>
              )}
            </div>

            {/* Special Instructions Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-4">
                <FileText className="text-pink-600" size={20} />
                Special Instructions
              </h2>
              
              <textarea
                placeholder="E.g., allergies, dietary preferences, cake design requests, specific delivery instructions..."
                value={customerInfo.specialInstructions}
                onChange={(e) => setCustomerInfo({...customerInfo, specialInstructions: e.target.value})}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-sm md:text-base"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">{customerInfo.specialInstructions.length}/500</p>
            </div>

            {/* Promo Code Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <button
                onClick={() => setShowPromo(!showPromo)}
                className="w-full flex items-center justify-between font-semibold text-pink-600 hover:text-pink-700 text-sm md:text-base"
              >
                <span className="flex items-center gap-2">
                  <Percent size={18} />
                  {appliedPromo ? `Promo: ${appliedPromo}` : 'Have a promo code?'}
                </span>
                <X className={`transition-transform ${showPromo ? 'rotate-0' : 'rotate-45'}`} size={18} />
              </button>

              {showPromo && !appliedPromo && (
                <div className="mt-3 md:mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase text-sm md:text-base"
                  />
                  <button
                    onClick={applyPromoCode}
                    className="px-4 md:px-6 py-2 md:py-3 bg-pink-600 text-white rounded-lg md:rounded-xl hover:bg-pink-700 transition font-semibold text-sm md:text-base shadow-md"
                  >
                    Apply
                  </button>
                </div>
              )}

              {appliedPromo && (
                <div className="mt-3 p-3 md:p-4 bg-green-50 border-2 border-green-200 rounded-lg md:rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle size={18} />
                    <div>
                      <p className="font-semibold text-sm">Promo applied!</p>
                      <p className="text-xs">Saved {currencySymbol}{discount.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    onClick={removePromo}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                <Package className="text-pink-600" size={20} />
                Order Summary
              </h2>

              <div className="space-y-2.5 md:space-y-3 mb-4 text-sm md:text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                  <span className="font-semibold">{currencySymbol}{totalPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Truck size={14} />
                    Delivery Fee
                  </span>
                  {deliveryFee === 0 ? (
                    <span className="font-semibold text-green-600 flex items-center gap-1">
                      <Gift size={14} />
                      FREE
                    </span>
                  ) : (
                    <span className="font-semibold">{currencySymbol}{deliveryFee}</span>
                  )}
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Packaging Fee</span>
                  <span className="font-semibold">{currencySymbol}{packagingFee}</span>
                </div>

                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({settings.taxRate}%)</span>
                    <span className="font-semibold">{currencySymbol}{tax.toFixed(2)}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-2">
                      <Percent size={14} />
                      Discount ({appliedPromo})
                    </span>
                    <span className="font-semibold">-{currencySymbol}{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-bold">Total Amount</span>
                  <span className="text-2xl md:text-3xl font-bold text-pink-600">{currencySymbol}{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4 md:mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl cursor-pointer hover:border-green-400 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="whatsapp"
                      checked={paymentMethod === 'whatsapp'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-4 h-4 md:w-5 md:h-5 text-green-600"
                    />
                    <MessageCircle className="text-green-600" size={18} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm md:text-base">WhatsApp Order</p>
                      <p className="text-xs text-gray-600">Confirm via WhatsApp</p>
                    </div>
                    <Zap className="text-yellow-500" size={18} />
                  </label>

                  {settings.enableCOD && (
                    <label className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl cursor-pointer hover:border-blue-400 transition">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-4 h-4 md:w-5 md:h-5 text-blue-600"
                      />
                      <Package className="text-blue-600" size={18} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm md:text-base">Cash on Delivery</p>
                        <p className="text-xs text-gray-600">Pay when you receive</p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl cursor-pointer hover:border-purple-400 transition relative overflow-hidden bg-gradient-to-r from-purple-50 to-pink-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-4 h-4 md:w-5 md:h-5 text-purple-600"
                    />
                    <CreditCard className="text-purple-600" size={18} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm md:text-base">Online Payment</p>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                          COMING SOON
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">UPI, Cards, Net Banking</p>
                    </div>
                    <Sparkles className="text-orange-500" size={18} />
                  </label>
                </div>
              </div>

              {/* Order Note */}
              <textarea
                placeholder="Any additional notes for your order..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none mb-4 text-sm md:text-base"
                rows={2}
              />

              {/* Terms */}
              <label className="flex items-start gap-2 md:gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-0.5"
                />
                <span className="text-xs md:text-sm text-gray-600">
                  I agree to the <Link href="/terms" className="text-pink-600 hover:underline font-semibold">terms and conditions</Link> and <Link href="/privacy" className="text-pink-600 hover:underline font-semibold">privacy policy</Link>
                </span>
              </label>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={submitting || !acceptTerms}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 md:py-4 rounded-lg md:rounded-xl hover:from-pink-700 hover:to-purple-700 transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing Order...
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    Place Order via WhatsApp • {currencySymbol}{finalTotal.toFixed(2)}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield size={12} className="text-green-600" />
                  <span>100% Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={12} className="text-blue-600" />
                  <span>Minimum 2 days advance order</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle size={12} className="text-green-600" />
                  <span>Fresh & Quality Guaranteed</span>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg">
              <h3 className="font-bold text-base md:text-lg mb-3 flex items-center gap-2">
                <Info size={18} />
                Need Help?
              </h3>
              <div className="space-y-2 text-xs md:text-sm">
                <a
                  href={`tel:${settings.phone || ''}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Phone size={14} />
                  {settings.phone || 'Contact us'}
                </a>
                <a
                  href={`https://wa.me/${(settings.whatsapp || '').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <MessageCircle size={14} />
                  WhatsApp Support
                </a>
                <p className="flex items-center gap-2">
                  <Clock size={14} />
                  {settings.businessHours || '9 AM - 9 PM'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
