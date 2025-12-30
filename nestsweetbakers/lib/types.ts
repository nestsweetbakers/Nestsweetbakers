// Product/Cake Interface
export interface Cake {
  id?: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
   imageUrl: string; // Main image
  images?: string[]; // Additional images (max 5)
  rating: number;
  reviewCount: number;
  orderCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isAvailable?: boolean;
  flavors?: string[];
  sizes?: string[];
  tags?: string[];
}

// Order Interface
export interface Order {
  id?: string;
  userId: string;
  cakeName: string;
  cakeId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime?: string;
  weight: string;
  flavor: string;
  message?: string;
  specialInstructions?: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string;
}

// Custom Cake Request Interface
export interface CustomRequest {
  id?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventType: string;
  cakeSize: string;
  flavor: string;
  design: string;
  budget: string;
  deliveryDate: string;
  deliveryAddress?: string;
  additionalNotes?: string;
  referenceImages?: string[];
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  estimatedPrice?: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Review Interface
export interface Review {
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  cakeId: string;
  cakeName: string;
  rating: number;
  comment: string;
  images?: string[];
  isApproved: boolean;
  createdAt: string;
  updatedAt?: string;
}

// User Interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  address?: string;
  createdAt?: string;
  lastLogin?: string;
  preferences?: {
    favoriteCategories?: string[];
    notifications?: boolean;
  };
}

// Cart Item Interface
export interface CartItem {
  id: string;
  cakeId: string;
  name: string;
  imageUrl: string;
  basePrice: number;
  weight: string;
  flavor: string;
  quantity: number;
  message?: string;
  totalPrice: number;
}

// Wishlist Item Interface
export interface WishlistItem {
  id: string;
  cakeId: string;
  name: string;
  imageUrl: string;
  basePrice: number;
  category: string;
  addedAt: string;
}

// Notification Interface
export interface Notification {
  id?: string;
  userId: string;
  type: 'order' | 'promotion' | 'reminder' | 'update' | 'admin';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

// Admin Notification Interface
export interface AdminNotification {
  id?: string;
  type: 'new-order' | 'custom-request' | 'review' | 'low-stock' | 'system';
  title: string;
  message: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  relatedId?: string;
  createdAt: string;
}

// Analytics Interface
export interface Analytics {
  id?: string;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  newCustomers: number;
  topCakes: Array<{ cakeId: string; cakeName: string; orders: number }>;
  categoryDistribution: Record<string, number>;
  averageOrderValue: number;
}

// Settings Interface
export interface SiteSettings {
  id?: string;
  businessName: string;
  tagline?: string;
  phone: string;
  email: string;
  address: string;
  workingHours?: string;
  minOrderValue?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  taxRate?: number;
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  paymentMethods?: string[];
  currency?: string;
  updatedAt?: string;
}

// Hero Slide Interface
export interface HeroSlide {
  id?: string;
  image: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  order: number;
  isActive?: boolean;
}

// Feature Interface
export interface Feature {
  id?: string;
  icon: string;
  title: string;
  description: string;
  order: number;
}

// Testimonial Interface
export interface Testimonial {
  id?: string;
  name: string;
  rating: number;
  comment: string;
  image?: string;
  date: string;
  order: number;
  isApproved?: boolean;
}

// Stats Interface
export interface Stats {
  orders: number;
  customers: number;
  cakes: number;
  rating: number;
}

// Footer Content Interface
export interface FooterContent {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  social: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  newsletter: {
    enabled: boolean;
    title: string;
    subtitle: string;
  };
}

// Feedback Interface
export interface Feedback {
  id?: string;
  orderId: string;
  userId: string;
  customerName: string;
  rating: number;
  comment: string;
  cakeQuality?: number;
  deliveryService?: number;
  valueForMoney?: number;
  wouldRecommend?: boolean;
  images?: string[];
  createdAt: string;
}

// Order Status Type
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';

// Payment Status Type
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

// Custom Request Status Type
export type CustomRequestStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';
