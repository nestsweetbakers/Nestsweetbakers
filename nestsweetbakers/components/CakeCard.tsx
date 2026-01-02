'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Cake } from '@/lib/types';
import { useSettings } from '@/hooks/useSettings';

import { 
  Star, 
  ShoppingCart, 
  Heart, 
  TrendingUp, 
  BadgePercent,
  Eye,
  Zap,
  Package,
  Award,
  ImageIcon,
  Sparkles,
  Clock,
  Flame,
  Gift,
  Check,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CakeCardProps {
  cake: Cake;
  showBadge?: boolean;
  variant?: 'default' | 'compact' | 'featured' | 'premium';
  index?: number;
}

export default function CakeCard({ cake, showBadge = false, variant = 'default', index = 0 }: CakeCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showInfo, showError } = useToast();
  const router = useRouter();
   const { currencySymbol } = useSettings(); 
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  // Calculate discount
  const discount = cake.discount || 0;
  const originalPrice = cake.basePrice || 0;
  const discountedPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
  const savings = originalPrice - discountedPrice;

  // Get all images
  const allImages = [cake.imageUrl, ...(cake.images || [])].filter(Boolean);
  const hasMultipleImages = allImages.length > 1;

  // Auto-rotate images on hover
  useEffect(() => {
    if (isHovered && hasMultipleImages) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setCurrentImageIndex(0);
    }
  }, [isHovered, hasMultipleImages, allImages.length]);

  // Check if in wishlist
  useEffect(() => {
    async function checkWishlist() {
      if (!user || !cake.id) {
        setCheckingWishlist(false);
        return;
      }
      
      try {
        const wishlistDoc = await getDoc(doc(db, 'wishlists', user.uid));
        if (wishlistDoc.exists()) {
          const items = wishlistDoc.data().items || [];
          setIsFavorite(items.includes(cake.id));
        }
      } catch (error) {
        console.error('Error checking wishlist:', error);
      } finally {
        setCheckingWishlist(false);
      }
    }
    checkWishlist();
  }, [user, cake.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showInfo('🔐 Please sign in to add to wishlist');
      setTimeout(() => router.push('/login'), 1000);
      return;
    }

    if (!cake.id) return;

    setIsLoading(true);

    try {
      const wishlistRef = doc(db, 'wishlists', user.uid);
      const wishlistDoc = await getDoc(wishlistRef);
      
      let items = wishlistDoc.exists() ? wishlistDoc.data().items || [] : [];

      if (isFavorite) {
        items = items.filter((id: string) => id !== cake.id);
        showSuccess('💔 Removed from wishlist');
      } else {
        items.push(cake.id);
        showSuccess('❤️ Added to wishlist!');
      }

      await setDoc(wishlistRef, { 
        items, 
        updatedAt: serverTimestamp() 
      }, { merge: true });

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showError('❌ Failed to update wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (cake.stock !== undefined && cake.stock === 0) {
      showError('😔 Sorry, this item is out of stock');
      return;
    }

    setAddingToCart(true);

    try {
      await addToCart(cake, 1, '');
      
      // Update order count
      if (cake.id) {
        try {
          await updateDoc(doc(db, 'products', cake.id), {
            orderCount: increment(1)
          });
        } catch (err) {
          console.error('Failed to update order count:', err);
        }
      }

      showSuccess(`✅ ${cake.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('❌ Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/cakes/${cake.id}`);
  };

  const imageUrl = allImages[currentImageIndex] || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600';

  // Animation delay based on index
  const animationDelay = `${index * 100}ms`;

  // Check if cake is trending (high orders recently)
  const isTrending = (cake.orderCount || 0) > 20;
  const isHotDeal = discount >= 30;
  const isLimitedStock = cake.stock !== undefined && cake.stock > 0 && cake.stock <= 5;

  return (
    <Link 
      href={`/cakes/${cake.id}`} 
      className="block group animate-fade-in"
      style={{ animationDelay }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 relative ${
        variant === 'featured' ? 'ring-4 ring-pink-400 ring-opacity-50' : ''
      } ${
        variant === 'premium' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200' : ''
      }`}>
        {/* Premium Corner Ribbon */}
        {variant === 'premium' && (
          <div className="absolute top-0 right-0 z-20">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-8 py-1 text-xs font-bold transform rotate-45 translate-x-6 translate-y-4 shadow-lg">
              PREMIUM
            </div>
          </div>
        )}

        {/* Image Section */}
        <div className={`relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 ${
          variant === 'compact' ? 'h-48' : variant === 'premium' ? 'h-72' : 'h-64'
        }`}>
          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-pink-300 rounded-full animate-ping"></div>
                <div className="relative w-20 h-20 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {/* Main Image with Parallax Effect */}
          <Image
            src={imageUrl}
            alt={cake.name}
            fill
            className={`object-cover transition-all duration-700 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${
              isHovered ? 'scale-125 rotate-2' : 'scale-100'
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onLoad={() => setImageLoaded(true)}
            priority={index < 4}
          />

          {/* Dynamic Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
            isHovered ? 'from-black/60 via-black/20 to-transparent opacity-100' : 'from-black/30 to-transparent opacity-0'
          }`} />

          {/* Animated Corner Shine Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute -top-full -left-full w-full h-full bg-gradient-to-br from-white/30 to-transparent transform rotate-12 transition-all duration-1000 ${
              isHovered ? 'translate-x-full translate-y-full' : ''
            }`} />
          </div>

          {/* Top Left Badges Stack */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {/* Hot Deal Badge */}
            {isHotDeal && (
              <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
                <Flame size={14} className="animate-bounce" />
                HOT DEAL
              </span>
            )}

            {/* Discount Badge */}
            {discount > 0 && !isHotDeal && (
              <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <BadgePercent size={14} />
                {discount}% OFF
              </span>
            )}

            {/* Trending Badge */}
            {isTrending && (
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Flame size={14} />
                TRENDING
              </span>
            )}

            {/* Category Badge */}
            {cake.category && (
              <span className="bg-pink-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                {cake.category}
              </span>
            )}

            {/* Bestseller Badge */}
            {showBadge && cake.orderCount && cake.orderCount > 10 && !isTrending && (
              <span className="bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <TrendingUp size={14} />
                Bestseller
              </span>
            )}

            {/* Top Rated Badge */}
            {cake.rating && cake.rating >= 4.5 && (
              <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Award size={14} />
                {cake.rating.toFixed(1)}★
              </span>
            )}

            {/* New Badge */}
            {cake.createdAt && isNewProduct(cake.createdAt) && (
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-bounce">
                <Sparkles size={14} />
                NEW
              </span>
            )}
          </div>

          {/* Top Right Status Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {/* Limited Stock Alert */}
            {isLimitedStock && (
              <span className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-1">
                <Clock size={14} />
                Only {cake.stock}!
              </span>
            )}

            {/* Out of Stock */}
            {cake.stock === 0 && (
              <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                Out of Stock
              </span>
            )}

            {/* Multiple Images Indicator */}
            {hasMultipleImages && (
              <span className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <ImageIcon size={14} />
                {allImages.length}
              </span>
            )}
          </div>

          {/* Image Navigation Dots */}
          {hasMultipleImages && isHovered && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`transition-all ${
                    idx === currentImageIndex 
                      ? 'w-6 h-2 bg-white' 
                      : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                  } rounded-full`}
                />
              ))}
            </div>
          )}

          {/* Wishlist Button - Enhanced */}
          {cake.stock !== 0 && (
            <button
              onClick={toggleWishlist}
              disabled={isLoading || checkingWishlist}
              className={`absolute top-3 right-3 p-3 rounded-full shadow-xl transition-all transform z-20 ${
                isFavorite 
                  ? 'bg-pink-600 text-white scale-110 rotate-12' 
                  : 'bg-white/95 backdrop-blur-sm text-gray-600 hover:bg-pink-50 hover:scale-110'
              } ${(isLoading || checkingWishlist) ? 'opacity-50 cursor-not-allowed' : 'hover:rotate-12'}`}
              title={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart 
                className={`${isFavorite ? 'fill-current animate-pulse' : ''} transition-all`} 
                size={20} 
              />
            </button>
          )}

          {/* Quick Actions - Enhanced */}
          {cake.stock !== 0 && (
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 transition-all duration-500 z-10" style={{
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateY(0)' : 'translateY(10px)'
            }}>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {addingToCart ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={handleQuickView}
                className="bg-white/95 backdrop-blur-sm text-gray-800 p-3 rounded-xl font-semibold shadow-lg hover:bg-white transition-all transform hover:scale-110"
                title="Quick View"
              >
                <Eye size={18} />
              </button>
            </div>
          )}

          {/* Flash Deal Overlay */}
          {isHotDeal && isHovered && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl text-lg font-black shadow-2xl flex items-center gap-3 animate-pulse">
                <Zap size={24} className="fill-current animate-bounce" />
                SUPER SAVER!
                <Zap size={24} className="fill-current animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Content Section - Enhanced */}
        <div className={`${variant === 'compact' ? 'p-3' : 'p-5'} relative`}>
          {/* Title with Icon */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`font-bold group-hover:text-pink-600 transition-colors line-clamp-2 flex-1 ${
              variant === 'compact' ? 'text-base' : 'text-lg'
            }`}>
              {cake.name}
            </h3>
            {variant === 'premium' && (
              <Gift className="text-amber-500 flex-shrink-0" size={20} />
            )}
          </div>
          
          {/* Description */}
          {variant !== 'compact' && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
              {cake.description}
            </p>
          )}

          {/* Rating with Stars */}
          {cake.rating && cake.rating > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={`transition-all ${
                      i < Math.round(cake.rating || 0) 
                        ? 'fill-yellow-400 text-yellow-400 scale-110' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-yellow-700">
                {cake.rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({cake.reviewCount || 0} reviews)
              </span>
            </div>
          )}

         {/* Price Section - Enhanced */}
<div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
  <div className="flex items-end justify-between">
    <div className="flex-1">
      {discount > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl font-black text-pink-600">
              {currencySymbol}{discountedPrice.toFixed(2)}
            </span>
            <span className="text-lg text-gray-400 line-through font-semibold">
              {currencySymbol}{originalPrice}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600 font-medium">per kg</span>
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold flex items-center gap-1">
              <Check size={12} />
              Save {currencySymbol}{savings.toFixed(2)}
            </span>
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
              {discount}% OFF
            </span>
          </div>
        </div>
      ) : (
        <div>
          <span className="text-3xl font-black text-pink-600">
            {currencySymbol}{originalPrice}
          </span>
          <span className="text-gray-500 text-sm ml-2 font-medium">per kg</span>
        </div>
      )}
    </div>

    {/* Order Count Badge remains the same */}
    {cake.orderCount && cake.orderCount > 5 && (
      <div className="flex flex-col items-end">
        <span className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-md">
          <Package size={12} />
          {cake.orderCount}+
        </span>
        <span className="text-xs text-gray-500 mt-1 font-medium">orders</span>
      </div>
    )}
  </div>
</div>


          {/* Features List */}
          <div className="flex items-center justify-between text-xs text-gray-600 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="flex items-center gap-1.5 font-semibold">
              <Check size={14} className="text-green-600" />
              Min 0.5 kg
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock size={14} className="text-blue-600" />
              Fresh daily
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Package size={14} className="text-purple-600" />
              Safe delivery
            </span>
          </div>

          {/* View Details Link */}
          <div className="flex items-center justify-center text-pink-600 font-bold text-sm group-hover:text-pink-700 transition-colors">
            <span>View Details</span>
            <ArrowRight className="ml-1 transform group-hover:translate-x-1 transition-transform" size={16} />
          </div>

          {/* Featured Badge Footer */}
          {variant === 'featured' && (
            <div className="mt-4 pt-4 border-t-2 border-pink-200">
              <p className="text-xs text-pink-600 font-black text-center flex items-center justify-center gap-2 uppercase tracking-wide">
                <Sparkles size={14} className="animate-pulse" />
                Featured Product
                <Sparkles size={14} className="animate-pulse" />
              </p>
            </div>
          )}
        </div>

        {/* Animated Border Glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl shadow-[0_0_40px_rgba(236,72,153,0.4)] animate-pulse"></div>
        </div>

        {/* Corner Sparkle Effect */}
        {isHovered && (
          <>
            <Sparkles className="absolute top-2 right-2 text-yellow-400 animate-ping" size={16} />
            <Sparkles className="absolute bottom-2 left-2 text-pink-400 animate-ping" size={16} />
          </>
        )}
      </div>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </Link>
  );
}

// Helper function to check if product is new (within 7 days)
function isNewProduct(createdAt: any): boolean {
  if (!createdAt) return false;
  
  try {
    let date: Date;
    
    if (typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      date = new Date(createdAt);
    }
    
    const daysSinceCreated = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7;
  } catch {
    return false;
  }
}
