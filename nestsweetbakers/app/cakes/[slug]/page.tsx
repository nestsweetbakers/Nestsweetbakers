'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { Cake } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  TrendingUp,
  ChevronLeft,
  Copy,
  Facebook,
  Twitter,
  Mail,
  CheckCircle,
  Package,
  Clock,
  Truck,
  Award,
  Loader2,
  X,
  Plus,
  Minus,
  MessageSquare,
  ChevronRight,
  Info,
  Zap,
  Gift,
  Tag,
  AlertCircle,
  ShieldCheck,
  Timer,
  BadgePercent,
  ImageIcon,
  Sparkles,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Flame,
  ThumbsUp,
  Eye,
  Download,
  Phone,
  Leaf,
  TrendingDown,
  Globe,
  CheckCheck,
  AlertTriangle,
  Box,
  Weight,
  Ruler,
  Cookie,
  Bell
} from 'lucide-react';

interface ExtendedCake extends Omit<Cake, 'discount' | 'stock'> {
  discount?: number;
  stock?: number;
  featured?: boolean;
  tags?: string[];
  deliveryPincodes?: string[];
  currency?: 'INR' | 'CAD';
  seoKeywords?: string[];
  availableFrom?: string;
  availableTo?: string;
  minOrder?: number;
  maxOrder?: number;
}

interface Review {
  id?: string;
  cakeId: string;
  userId?: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  approved: boolean;
  verified?: boolean;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
}

export default function CakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();

  const [cake, setCake] = useState<ExtendedCake | null>(null);
  const [allCakes, setAllCakes] = useState<ExtendedCake[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState<'kg' | 'lb'>('kg');
  const [customization, setCustomization] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'delivery'>('details');
  const [viewCount, setViewCount] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    comment: '',
  });

  // Pincode check state
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'available' | 'unavailable'>('idle');

  // Global & product pincodes
  const globalPincodes = (settings?.allowedPincodes || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  const productPincodes = cake?.deliveryPincodes || [];
  const effectivePincodes = productPincodes.length > 0 ? productPincodes : globalPincodes;

  // Settings-driven delivery config
  const deliveryFee = settings?.deliveryFee ?? 50;
  const freeDeliveryAbove = settings?.freeDeliveryAbove ?? 500;

  // Currency
  const currencySymbol = cake?.currency === 'CAD' ? '$' : '₹';
  const currencyName = cake?.currency === 'CAD' ? 'CAD' : 'INR';

  // Discount
  const discount = cake?.discount || 0;
  const originalPrice = cake?.basePrice || 0;
  const discountedPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
  const savings = originalPrice - discountedPrice;

  // Weight conversion
  const displayWeight =
    selectedWeight === 'kg'
      ? quantity
      : (quantity * 2.20462).toFixed(2);
  const weightUnit = selectedWeight === 'kg' ? 'kg' : 'lb';

  // Images
  const allImages = useMemo(() => {
    if (!cake) return [];
    const images = [cake.imageUrl];
    if (cake.images && cake.images.length > 0) {
      images.push(...cake.images);
    }
    return images.filter(Boolean);
  }, [cake]);

  // Availability window
  const isAvailable = useMemo(() => {
    if (!cake) return true;
    const now = new Date();

    if (cake.availableFrom) {
      const from = new Date(cake.availableFrom);
      if (now < from) return false;
    }

    if (cake.availableTo) {
      const to = new Date(cake.availableTo);
      if (now > to) return false;
    }

    return true;
  }, [cake]);

  // Toast
  const showToast = (type: ToastMessage['type'], message: string, description?: string) => {
    setToast({ type, message, description });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch cake + reviews + all cakes
  useEffect(() => {
    async function fetchData() {
      if (!slug) return;

      try {
        const docRef = doc(db, 'products', slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const cakeData = { id: docSnap.id, ...docSnap.data() } as ExtendedCake;
          setCake(cakeData);

          // View count
          try {
            await updateDoc(docRef, {
              viewCount: increment(1),
            });
            setViewCount((cakeData as any).viewCount || 0);
          } catch (err) {
            console.error('Failed to update view count:', err);
          }

          // Reviews for this cake
          const reviewsRef = collection(db, 'reviews');
          const reviewsSnap = await getDocs(reviewsRef);
          const cakeReviews = reviewsSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Review))
            .filter(r => r.cakeId === slug && r.approved)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
          setReviews(cakeReviews);
        }

        // All cakes for recommendations
        const allCakesSnap = await getDocs(collection(db, 'products'));
        const cakesData = allCakesSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as ExtendedCake));
        setAllCakes(cakesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('error', 'Failed to load cake details', 'Please try refreshing the page');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Wishlist check
  useEffect(() => {
    async function checkWishlist() {
      if (!user || !slug) {
        setCheckingWishlist(false);
        return;
      }

      try {
        const wishlistDoc = await getDoc(doc(db, 'wishlists', user.uid));
        if (wishlistDoc.exists()) {
          const wishlist = wishlistDoc.data().items || [];
          setIsFavorite(wishlist.includes(slug));
        }
      } catch (error) {
        console.error('Error checking wishlist:', error);
      } finally {
        setCheckingWishlist(false);
      }
    }

    checkWishlist();
  }, [user, slug]);

  // Recommended cakes
  const recommendedCakes = useMemo(() => {
    if (!cake || allCakes.length === 0) return [];

    return allCakes
      .filter(c => c.id !== cake.id)
      .map(c => {
        let score = 0;
        if (c.category === cake.category) score += 5;
        if ((c.orderCount || 0) > 10) score += 3;
        const priceDiff = Math.abs((c.basePrice || 0) - (cake.basePrice || 0));
        if (priceDiff < 200) score += 2;
        if ((c.discount || 0) > 0) score += 1;
        if (c.featured) score += 2;

        return { ...c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [cake, allCakes]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => dist[r.rating - 1]++);
    return dist.reverse();
  }, [reviews]);

  // Add to cart (passes customization)
  const handleAddToCart = async () => {
    if (!cake) return;

    if (!isAvailable) {
      showToast('error', 'Product Not Available', 'This product is currently not available for purchase');
      return;
    }

    if (cake.minOrder && quantity < cake.minOrder) {
      showToast('error', `Minimum order is ${cake.minOrder} kg`, 'Please increase the quantity');
      return;
    }

    if (cake.maxOrder && quantity > cake.maxOrder) {
      showToast('error', `Maximum order is ${cake.maxOrder} kg`, 'Please decrease the quantity');
      return;
    }

    if (cake.stock !== undefined && cake.stock === 0) {
      showToast('error', 'Out of Stock', 'This item is currently out of stock');
      return;
    }

    setAddingToCart(true);

    try {
      await addToCart(cake as Cake, quantity, customization);

      try {
        await updateDoc(doc(db, 'products', slug), {
          orderCount: increment(1),
        });
      } catch (err) {
        console.error('Failed to update order count:', err);
      }

      showToast(
        'success',
        'Added to Cart! 🎉',
        `${cake.name} - ${quantity}${weightUnit} added successfully`
      );

      setTimeout(() => {
        const proceed = confirm('🛒 Go to cart to complete your order?');
        if (proceed) {
          router.push('/cart');
        }
      }, 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('error', 'Failed to add to cart', 'Please try again');
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      showToast('info', 'Sign in required', 'Please sign in to add to wishlist');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    try {
      const wishlistRef = doc(db, 'wishlists', user.uid);
      const wishlistDoc = await getDoc(wishlistRef);

      let wishlist = wishlistDoc.exists() ? wishlistDoc.data().items || [] : [];

      if (isFavorite) {
        wishlist = wishlist.filter((id: string) => id !== slug);
        showToast('success', 'Removed from wishlist');
      } else {
        wishlist.push(slug);
        showToast('success', 'Added to wishlist ❤️');
      }

      await setDoc(
        wishlistRef,
        {
          items: wishlist,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showToast('error', 'Failed to update wishlist');
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${cake?.name}! ${
      discount > 0 ? `Get ${discount}% OFF!` : ''
    }`;

    switch (platform) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          showToast('success', 'Link copied! 📋');
        } catch (err) {
          showToast('error', 'Failed to copy link');
        }
        break;
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          '_blank'
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
          )}&text=${encodeURIComponent(text)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(
          text
        )}&body=${encodeURIComponent(url)}`;
        break;
    }

    setShowShareMenu(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('info', 'Sign in required', 'Please sign in to submit a review');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    if (reviewForm.comment.length < 10) {
      showToast('error', 'Review too short', 'Please write at least 10 characters');
      return;
    }

    try {
      await addDoc(collection(db, 'reviews'), {
        cakeId: slug,
        userId: user.uid,
        customerName:
          reviewForm.name || user.displayName || 'Anonymous',
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: new Date().toISOString(),
        approved: false,
        verified: true,
      });

      showToast(
        'success',
        'Review submitted! ✓',
        'Your review will appear after approval'
      );
      setShowReviewForm(false);
      setReviewForm({ name: '', rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('error', 'Failed to submit review');
    }
  };

  // Pincode check handlers
  const handleCheckPincode = () => {
    const pin = pincodeInput.trim();
    if (!pin) return;

    if (effectivePincodes.includes(pin)) {
      setPincodeStatus('available');
    } else {
      setPincodeStatus('unavailable');
    }
  };

  const handleRequestPincode = async () => {
    const pin = pincodeInput.trim();
    if (!pin) return;

    try {
      await addDoc(collection(db, 'pincode_requests'), {
        pincode: pin,
        userId: user?.uid || null,
        createdAt: serverTimestamp(),
        productId: cake?.id || slug,
      });
      showToast(
        'success',
        'Request submitted!',
        'We will contact you if delivery becomes available.'
      );
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to submit request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping" />
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-semibold text-lg animate-pulse">
            Loading delicious cake...
          </p>
        </div>
      </div>
    );
  }

  if (!cake) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4">
        <div className="text-center bg-white p-8 md:p-12 rounded-2xl shadow-2xl max-w-md">
          <div className="text-6xl mb-4">🎂</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Cake Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The cake you&apos;re looking for doesn&apos;t exist
          </p>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg"
          >
            <ChevronLeft size={20} />
            Browse All Cakes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-4 md:py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 md:left-auto z-50 animate-slide-in-right max-w-md ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
              ? 'bg-red-500'
              : toast.type === 'warning'
              ? 'bg-orange-500'
              : 'bg-blue-500'
          } text-white rounded-xl shadow-2xl overflow-hidden`}
        >
          <div className="p-4 flex items-start gap-3">
            <div className="flex-shrink-0">
              {toast.type === 'success' && <CheckCircle size={24} />}
              {toast.type === 'error' && <AlertCircle size={24} />}
              {toast.type === 'warning' && <AlertTriangle size={24} />}
              {toast.type === 'info' && <Info size={24} />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-base md:text-lg">
                {toast.message}
              </p>
              {toast.description && (
                <p className="text-sm opacity-90 mt-1">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <div className="h-1 bg-white/30">
            <div className="h-full bg-white animate-progress" />
          </div>
        </div>
      )}

      {/* Image Modal with next/prev */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition z-10"
          >
            <X size={24} />
          </button>

          {allImages.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev =>
                    prev === 0 ? allImages.length - 1 : prev - 1
                  );
                }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev =>
                    prev === allImages.length - 1 ? 0 : prev + 1
                  );
                }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div className="relative w-full max-w-6xl h-[70vh] md:h-[80vh]">
            <Image
              src={allImages[selectedImageIndex] || ''}
              alt={cake.name}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center px-4">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImageIndex(index);
                }}
                className={`w-3 h-3 rounded-full transition ${
                  index === selectedImageIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 text-sm mb-6 animate-fade-in">
          <Link
            href="/"
            className="text-gray-600 hover:text-pink-600 transition"
          >
            Home
          </Link>
          <ChevronRight size={16} className="text-gray-400" />
          <Link
            href="/cakes"
            className="text-gray-600 hover:text-pink-600 transition"
          >
            Cakes
          </Link>
          <ChevronRight size={16} className="text-gray-400" />
          <Link
            href={`/cakes?category=${cake.category}`}
            className="text-gray-600 hover:text-pink-600 transition"
          >
            {cake.category}
          </Link>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-pink-600 font-semibold truncate max-w-[200px]">
            {cake.name}
          </span>
        </div>

        {/* Back */}
        <Link
          href="/cakes"
          className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 mb-4 md:mb-6 font-semibold group transition-all"
        >
          <ChevronLeft
            className="group-hover:-translate-x-1 transition-transform"
            size={20}
          />
          <span className="md:inline">Back</span>
        </Link>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 bg-white rounded-xl md:rounded-2xl shadow-2xl overflow-hidden mb-8 md:mb-12 animate-fade-in">
          {/* Images */}
          <div className="relative">
            <div
              className="relative h-64 sm:h-80 md:h-96 lg:h-[600px] bg-gradient-to-br from-pink-50 to-purple-50 cursor-zoom-in group"
              onClick={() => setShowImageModal(true)}
            >
              <Image
                src={
                  allImages[selectedImageIndex] ||
                  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'
                }
                alt={cake.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <div className="bg-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-2">
                  <Zap size={16} />
                  Click to zoom
                </div>
              </div>

              {/* Left badges */}
              <div className="absolute top-2 md:top-4 left-2 md:left-4 flex flex-col gap-1.5 md:gap-2 animate-slide-in-left">
                {!isAvailable && (
                  <span className="bg-red-600 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg backdrop-blur-sm flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Not Available
                  </span>
                )}

                {discount > 0 && (
                  <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg backdrop-blur-sm flex items-center gap-1 animate-pulse">
                    <BadgePercent size={14} />
                    {discount}% OFF
                  </span>
                )}

                {cake.featured && (
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                    <Star size={14} className="fill-current" />
                    Featured
                  </span>
                )}

                <span className="bg-pink-600/90 backdrop-blur-sm text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg">
                  {cake.category}
                </span>

                {cake.orderCount && cake.orderCount > 20 && (
                  <span className="bg-purple-600 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                    <Flame size={14} />
                    Trending
                  </span>
                )}

                {allImages.length > 1 && (
                  <span className="bg-blue-600 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                    <ImageIcon size={14} />
                    {allImages.length} Photos
                  </span>
                )}

                <span className="bg-green-600 text-white px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                  <Globe size={14} />
                  {currencyName}
                </span>
              </div>

              {/* Right badges */}
              <div className="absolute top-2 md:top-4 right-2 md:right-4 flex flex-col gap-1.5 md:gap-2">
                {cake.stock !== undefined && (
                  <span
                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${
                      cake.stock > 10
                        ? 'bg-green-500 text-white'
                        : cake.stock > 0
                        ? 'bg-orange-500 text-white animate-pulse'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {cake.stock > 0
                      ? `${cake.stock} in stock`
                      : 'Out of stock'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 flex gap-2 animate-slide-in-right">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleWishlist();
                  }}
                  disabled={checkingWishlist}
                  className={`p-2 md:p-3 rounded-full shadow-lg transition-all transform hover:scale-110 ${
                    isFavorite
                      ? 'bg-pink-600 text-white'
                      : 'bg-white/95 backdrop-blur-sm text-gray-600 hover:bg-pink-100'
                  } ${
                    checkingWishlist
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <Heart
                    className={isFavorite ? 'fill-current' : ''}
                    size={18}
                  />
                </button>

                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowShareMenu(!showShareMenu);
                    }}
                    className="p-2 md:p-3 bg-white/95 backdrop-blur-sm text-gray-600 rounded-full shadow-lg hover:bg-pink-100 transition-all transform hover:scale-110"
                  >
                    <Share2 size={18} />
                  </button>

                  {showShareMenu && (
                    <div className="absolute top-12 right-0 bg-white rounded-xl shadow-2xl p-2 z-20 min-w-[180px] md:min-w-[200px] animate-scale-in">
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 rounded-lg transition text-left"
                      >
                        <Copy size={16} />
                        <span className="text-sm font-medium">
                          Copy Link
                        </span>
                      </button>
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 rounded-lg transition text-left"
                      >
                        <span className="text-lg">💬</span>
                        <span className="text-sm font-medium">
                          WhatsApp
                        </span>
                      </button>
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 rounded-lg transition text-left"
                      >
                        <Facebook size={16} />
                        <span className="text-sm font-medium">
                          Facebook
                        </span>
                      </button>
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 rounded-lg transition text-left"
                      >
                        <Twitter size={16} />
                        <span className="text-sm font-medium">
                          Twitter
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="p-2 md:p-4 flex gap-2 overflow-x-auto scrollbar-hide">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                      index === selectedImageIndex
                        ? 'ring-4 ring-pink-600 scale-110'
                        : 'ring-2 ring-gray-200 hover:ring-pink-400'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${cake.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-4 md:p-6 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                {cake.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {viewCount > 0 && (
                  <span className="flex items-center gap-1 text-xs md:text-sm text-gray-600 bg-gray-100 px-2 md:px-3 py-1 rounded-full">
                    <Eye size={14} />
                    {viewCount} views
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      i < Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span className="text-sm md:text-base font-bold text-yellow-700">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-xs md:text-sm text-gray-600">
                ({reviews.length}{' '}
                {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
              {cake.orderCount && cake.orderCount > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center gap-1">
                    <TrendingUp
                      size={14}
                      className="text-green-600"
                    />
                    {cake.orderCount} orders
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-4 md:mb-6 leading-relaxed text-sm md:text-base lg:text-lg">
              {cake.description}
            </p>

            {/* Tags */}
            {cake.tags && cake.tags.length > 0 && (
              <div className="mb-4 md:mb-6">
                <div className="flex flex-wrap gap-2">
                  {cake.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 md:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1"
                    >
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 animate-fade-in">
              {discount > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                    <span className="text-3xl md:text-4xl font-black text-pink-600">
                      {currencySymbol}
                      {discountedPrice.toFixed(2)}
                    </span>
                    <span className="text-xl md:text-2xl text-gray-400 line-through font-semibold">
                      {currencySymbol}
                      {originalPrice}
                    </span>
                    <span className="bg-red-600 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold">
                      Save {currencySymbol}
                      {savings.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2">
                    <BadgePercent
                      size={14}
                      className="text-red-600"
                    />
                    {discount}% discount applied • per kg •{' '}
                    {currencyName}
                  </p>
                </>
              ) : (
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl md:text-4xl font-black text-pink-600">
                    {currencySymbol}
                    {originalPrice}
                  </span>
                  <span className="text-gray-500 text-sm md:text-base">
                    per kg ({currencyName})
                  </span>
                </div>
              )}

              {(cake.minOrder || cake.maxOrder) && (
                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 mt-3 pt-3 border-t border-pink-200">
                  {cake.minOrder && (
                    <span className="flex items-center gap-1">
                      <Weight
                        size={14}
                        className="text-blue-600"
                      />
                      Min: {cake.minOrder} kg
                    </span>
                  )}
                  {cake.maxOrder && (
                    <span className="flex items-center gap-1">
                      <Ruler
                        size={14}
                        className="text-purple-600"
                      />
                      Max: {cake.maxOrder} kg
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 mt-3 pt-3 border-t border-pink-200">
                <span className="flex items-center gap-1">
                  <CheckCircle
                    size={14}
                    className="text-green-600"
                  />
                  Fresh daily
                </span>
                <span className="flex items-center gap-1">
                  <Package
                    size={14}
                    className="text-blue-600"
                  />
                  Premium quality
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck
                    size={14}
                    className="text-purple-600"
                  />
                  Guaranteed
                </span>
              </div>
            </div>

            {/* Availability dates */}
            {(cake.availableFrom || cake.availableTo) && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Availability Period
                </p>
                <div className="space-y-1 text-xs md:text-sm text-blue-800">
                  {cake.availableFrom && (
                    <p>
                      From:{' '}
                      {new Date(
                        cake.availableFrom
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {cake.availableTo && (
                    <p>
                      Until:{' '}
                      {new Date(
                        cake.availableTo
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Weight unit toggle */}
            <div className="mb-4 md:mb-6 animate-fade-in">
              <label className="block text-sm font-semibold mb-3">
                Weight Unit
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWeight('kg')}
                  className={`flex-1 px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold text-sm md:text-base transition ${
                    selectedWeight === 'kg'
                      ? 'bg-pink-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Kilograms (kg)
                </button>
                <button
                  onClick={() => setSelectedWeight('lb')}
                  className={`flex-1 px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold text-sm md:text-base transition ${
                    selectedWeight === 'lb'
                      ? 'bg-pink-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Pounds (lb)
                </button>
              </div>
            </div>

            {/* Quantity selector (typeable) */}
            <div className="mb-4 md:mb-6 animate-fade-in">
              <label className="block text-sm font-semibold mb-3">
                Quantity ({weightUnit})
              </label>
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() =>
                    setQuantity(
                      Math.max(
                        cake.minOrder || 0.5,
                        quantity - 0.5
                      )
                    )
                  }
                  disabled={quantity <= (cake.minOrder || 0.5)}
                  className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                >
                  <Minus size={18} />
                </button>

                <div className="flex-1 text-center">
                  <input
                    type="number"
                    step="0.5"
                    min={
                      selectedWeight === 'kg'
                        ? cake.minOrder || 0.5
                        : (cake.minOrder || 0.5) * 2.20462
                    }
                    max={
                      selectedWeight === 'kg'
                        ? cake.maxOrder || undefined
                        : cake.maxOrder
                        ? cake.maxOrder * 2.20462
                        : undefined
                    }
                    value={displayWeight}
                    onChange={e => {
                      let val = parseFloat(e.target.value);
                      if (isNaN(val) || val <= 0) {
                        val =
                          selectedWeight === 'kg'
                            ? cake.minOrder || 0.5
                            : (cake.minOrder || 0.5) * 2.20462;
                      }

                      if (selectedWeight === 'kg') {
                        if (
                          cake.minOrder &&
                          val < cake.minOrder
                        )
                          val = cake.minOrder;
                        if (
                          cake.maxOrder &&
                          val > cake.maxOrder
                        )
                          val = cake.maxOrder;
                        setQuantity(val);
                      } else {
                        const minKg = cake.minOrder || 0.5;
                        const maxKg = cake.maxOrder;
                        let kg = val / 2.20462;
                        if (kg < minKg) kg = minKg;
                        if (maxKg && kg > maxKg) kg = maxKg;
                        setQuantity(parseFloat(kg.toFixed(2)));
                      }
                    }}
                    className="w-full text-center text-2xl md:text-3xl font-bold bg-pink-50 px-4 md:px-6 py-2 rounded-lg border-2 border-pink-200"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">
                    {weightUnit}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setQuantity(
                      cake.maxOrder
                        ? Math.min(
                            cake.maxOrder,
                            quantity + 0.5
                          )
                        : quantity + 0.5
                    )
                  }
                  disabled={
                    cake.maxOrder
                      ? quantity >= cake.maxOrder
                      : false
                  }
                  className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 flex flex-wrap items-center gap-2">
                  <Tag size={16} />
                  Total:{' '}
                  {currencySymbol}
                  {(discountedPrice * quantity).toFixed(2)}
                  {discount > 0 && (
                    <span className="text-xs text-green-700">
                      (Save {currencySymbol}
                      {(savings * quantity).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Customization */}
            <div className="mb-6 md:mb-8 animate-fade-in">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="text-pink-600"
                />
                Special Instructions (Optional)
              </label>
              <textarea
                value={customization}
                onChange={e =>
                  setCustomization(e.target.value)
                }
                placeholder="E.g., 'Happy Birthday John', flavor preferences, dietary requirements..."
                className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition resize-none text-sm md:text-base"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customization.length}/500 characters
              </p>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={
                addingToCart ||
                (cake.stock !== undefined &&
                  cake.stock === 0) ||
                !isAvailable
              }
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 md:py-4 px-4 md:px-6 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all font-bold text-sm md:text-lg mb-3 md:mb-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {addingToCart ? (
                <>
                  <Loader2
                    className="animate-spin"
                    size={20}
                  />
                  Adding...
                </>
              ) : cake.stock !== undefined &&
                cake.stock === 0 ? (
                <>
                  <AlertCircle size={20} />
                  Out of Stock
                </>
              ) : !isAvailable ? (
                <>
                  <AlertTriangle size={20} />
                  Not Available
                </>
              ) : (
                <>
                  <ShoppingCart size={20} />
                  Add to Cart - {currencySymbol}
                  {(discountedPrice * quantity).toFixed(2)}
                </>
              )}
            </button>

            {/* Custom cakes link */}
            <Link
              href="/custom-cakes"
              className="block w-full text-center bg-white text-pink-600 border-2 border-pink-600 py-3 md:py-4 px-4 md:px-6 rounded-xl hover:bg-pink-50 transition-all font-bold text-sm md:text-lg mb-4 flex items-center justify-center gap-2"
            >
              <Gift size={20} />
              Want Custom Design?
            </Link>

            {/* Trust badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 pt-4 md:pt-6 border-t">
              <div className="text-center p-2">
                <CheckCircle
                  className="mx-auto mb-1 md:mb-2 text-green-600"
                  size={20}
                />
                <p className="text-xs font-semibold text-gray-700">
                  Fresh Daily
                </p>
              </div>
              <div className="text-center p-2">
                <Truck
                  className="mx-auto mb-1 md:mb-2 text-blue-600"
                  size={20}
                />
                <p className="text-xs font-semibold text-gray-700">
                  Safe Delivery
                </p>
              </div>
              <div className="text-center p-2">
                <Timer
                  className="mx-auto mb-1 md:mb-2 text-purple-600"
                  size={20}
                />
                <p className="text-xs font-semibold text-gray-700">
                  On-Time
                </p>
              </div>
              <div className="text-center p-2">
                <ShieldCheck
                  className="mx-auto mb-1 md:mb-2 text-pink-600"
                  size={20}
                />
                <p className="text-xs font-semibold text-gray-700">
                  Guaranteed
                </p>
              </div>
            </div>

            {/* Pincode check & request (uses effectivePincodes) */}
            {effectivePincodes.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Check Delivery to Your Area
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={pincodeInput}
                    onChange={e => {
                      setPincodeInput(e.target.value);
                      setPincodeStatus('idle');
                    }}
                    placeholder="Enter your pincode"
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleCheckPincode}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700 transition"
                  >
                    Check
                  </button>
                </div>

                {pincodeStatus === 'available' && (
                  <p className="mt-2 text-sm text-green-700 flex items-center gap-1">
                    <CheckCircle
                      size={16}
                      className="text-green-600"
                    />
                    Delivery is available to this pincode.
                  </p>
                )}

                {pincodeStatus === 'unavailable' && (
                  <div className="mt-2 text-sm text-red-700 space-y-2">
                    <p className="flex items-center gap-1">
                      <AlertCircle
                        size={16}
                        className="text-red-600"
                      />
                      Delivery is currently not available to this
                      pincode.
                    </p>
                    <button
                      onClick={handleRequestPincode}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-xs font-semibold hover:bg-orange-200 transition"
                    >
                      <Bell size={14} />
                      Request delivery to my area
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-6 lg:p-10 mb-8 md:mb-12 animate-fade-in">
          <div className="flex gap-2 md:gap-4 mb-6 md:mb-8 border-b overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 md:pb-4 px-3 md:px-6 font-bold text-sm md:text-base whitespace-nowrap transition ${
                activeTab === 'details'
                  ? 'border-b-4 border-pink-600 text-pink-600'
                  : 'text-gray-600 hover:text-pink-600'
              }`}
            >
              <Info size={18} className="inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 md:pb-4 px-3 md:px-6 font-bold text-sm md:text-base whitespace-nowrap transition ${
                activeTab === 'reviews'
                  ? 'border-b-4 border-pink-600 text-pink-600'
                  : 'text-gray-600 hover:text-pink-600'
              }`}
            >
              <MessageSquare
                size={18}
                className="inline mr-2"
              />
              Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`pb-3 md:pb-4 px-3 md:px-6 font-bold text-sm md:text-base whitespace-nowrap transition ${
                activeTab === 'delivery'
                  ? 'border-b-4 border-pink-600 text-pink-600'
                  : 'text-gray-600 hover:text-pink-600'
              }`}
            >
              <Truck size={18} className="inline mr-2" />
              Delivery
            </button>
          </div>

          {/* Details tab content (unchanged from your version) */}
          {/* ... keep your existing 'details' and 'reviews' tab content as in file:328 ... */}

          {/* Delivery tab */}
          {activeTab === 'delivery' && (
            <div className="animate-fade-in space-y-4 md:space-y-6">
              <div className="p-4 md:p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <Truck size={20} className="text-blue-600" />
                  Delivery Information
                </h3>
                <ul className="space-y-3 text-xs md:text-sm text-gray-700">
                  <li className="flex items-start gap-3">
                    <Clock
                      size={16}
                      className="text-blue-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold">
                        Same-day delivery available
                      </p>
                      <p className="text-gray-600">
                        Order before 3 PM for same-day delivery
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <DollarSign
                      size={16}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold">
                        Free delivery on orders above{' '}
                        {currencySymbol}
                        {freeDeliveryAbove}
                      </p>
                      <p className="text-gray-600">
                        Delivery charges: {currencySymbol}
                        {deliveryFee} for orders below{' '}
                        {currencySymbol}
                        {freeDeliveryAbove}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShieldCheck
                      size={16}
                      className="text-purple-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold">
                        Safe & hygienic packaging
                      </p>
                      <p className="text-gray-600">
                        Temperature controlled delivery boxes
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-red-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold">
                        Real-time tracking
                      </p>
                      <p className="text-gray-600">
                        Track your order from kitchen to doorstep
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {effectivePincodes.length > 0 && (
                <div className="p-4 md:p-6 bg-cyan-50 rounded-xl border border-cyan-200">
                  <h3 className="font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                    <MapPin
                      size={20}
                      className="text-cyan-600"
                    />
                    Delivery Pincodes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {effectivePincodes.map((pincode, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-cyan-100 text-cyan-800 rounded-lg text-xs md:text-sm font-semibold"
                      >
                        {pincode}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 md:p-6 bg-orange-50 rounded-xl border border-orange-200">
                <h3 className="font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <Phone
                    size={20}
                    className="text-orange-600"
                  />
                Need Help?
                </h3>
                <p className="text-xs md:text-sm text-gray-700 mb-3">
                  Have questions about delivery? Our customer support
                  team is here to help!
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="tel:+919876543210"
                    className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition font-semibold text-center text-sm md:text-base"
                  >
                    Call Now
                  </a>
                  <a
                    href="https://wa.me/919876543210"
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-semibold text-center text-sm md:text-base"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Keep your existing 'details' and 'reviews' tab JSX from file:328 above this point */}
        </div>

        {/* Recommended products (same as your version) */}
        {/* ... keep recommended cakes section from file:328 ... */}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }

        .animate-progress {
          animation: progress 5s linear forwards;
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
