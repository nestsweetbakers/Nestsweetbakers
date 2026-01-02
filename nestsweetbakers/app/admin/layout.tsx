'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Star, 
  MessageSquare, 
  Image as ImageIcon,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Home,
  Shield,
  FileText,
  Gift,
  Bell,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
 const { user, isAdmin, isSuperAdmin, loading, signOut } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [stats, setStats] = useState({
  pendingOrders: 0,
  pendingRequests: 0,
  pendingReviews: 0,
  todayOrders: 0,
  todayRevenueINR: 0,
  todayRevenueCAD: 0,
});


  // Real-time stats
  useEffect(() => {
    if (!user || !isAdmin) return;

    const unsubscribers: (() => void)[] = [];

    // Pending Orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'processing'])
    );
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingOrders: snapshot.size }));
    });
    unsubscribers.push(unsubOrders);

    // Pending Custom Requests
    const requestsQuery = query(
      collection(db, 'customRequests'),
      where('status', '==', 'pending')
    );
    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingRequests: snapshot.size }));
    });
    unsubscribers.push(unsubRequests);

    // Pending Reviews
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('approved', '==', false)
    );
    const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, pendingReviews: snapshot.size }));
    });
    unsubscribers.push(unsubReviews);

    // Today's stats
    const fetchTodayStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrdersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', today)
      );
      
      const ordersSnap = await getDocs(todayOrdersQuery);
      let revenueINR = 0;
let revenueCAD = 0;

ordersSnap.forEach(doc => {
  const data = doc.data();
  if (data.status === 'completed') {
    const amount = data.total ?? data.totalAmount ?? data.totalPrice ?? 0;
    const currency = (data.currency || 'INR') as 'INR' | 'CAD';
    if (currency === 'CAD') revenueCAD += amount;
    else revenueINR += amount;
  }
});

setStats(prev => ({
  ...prev,
  todayOrders: ordersSnap.size,
  todayRevenueINR: revenueINR,
  todayRevenueCAD: revenueCAD,
}));

    };

    fetchTodayStats();
    const interval = setInterval(fetchTodayStats, 60000); // Update every minute

    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, [user, isAdmin]);

  useEffect(() => {
  // Wait for auth to finish
  if (loading) return;

  const hasAccess = user && (isAdmin || isSuperAdmin);
  if (!hasAccess) {
    router.replace('/'); // or '/login' if you prefer
  }
}, [loading, user, isAdmin, isSuperAdmin, router]);


 // While auth is loading, show loader
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
          <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-semibold text-lg">Loading admin panel...</p>
        <p className="text-gray-500 text-sm mt-2">Verifying credentials...</p>
      </div>
    </div>
  );
}

// After loading, if still no access, block
if (!user || (!isAdmin && !isSuperAdmin)) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="text-center">
        <p className="text-gray-600 font-semibold text-lg">
          You do not have permission to access the admin panel.
        </p>
      </div>
    </div>
  );
}

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', badge: null },
    { icon: Package, label: 'Products', href: '/admin/products', badge: null },
    { icon: ShoppingBag, label: 'Orders', href: '/admin/orders', badge: stats.pendingOrders > 0 ? stats.pendingOrders.toString() : null },
    { icon: Gift, label: 'Custom Requests', href: '/admin/custom-requests', badge: stats.pendingRequests > 0 ? stats.pendingRequests.toString() : null },
    { icon: Star, label: 'Reviews', href: '/admin/reviews', badge: stats.pendingReviews > 0 ? stats.pendingReviews.toString() : null },
    { icon: ImageIcon, label: 'Hero Slides', href: '/admin/hero-slides', badge: null },
    { icon: FileText, label: 'Testimonials', href: '/admin/testimonials', badge: null },
    ...(isSuperAdmin ? [{ icon: Shield, label: 'User Management', href: '/admin/users', badge: null }] : []),
    { icon: Settings, label: 'Settings', href: '/admin/settings', badge: null },
  ];

  const handleSignOut = () => {
    setConfirmLogout(true);
  };

  const confirmSignOut = async () => {
    await signOut();
    setConfirmLogout(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {confirmLogout && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">Sign Out?</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to sign out from the admin panel?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen z-50 w-72 lg:w-80
        bg-white shadow-2xl transform transition-all duration-300 ease-out
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b bg-gradient-to-r from-pink-600 to-purple-600 text-white flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-bounce-slow">🍰</span>
                <div>
                  <span className="font-bold text-2xl block leading-tight">Admin Panel</span>
                  <span className="text-xs text-pink-100">NestSweets Bakery</span>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Quick Stats in Sidebar */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} />
                  <span className="text-xs font-semibold">Today</span>
                </div>
                <p className="text-lg font-bold">{stats.todayOrders}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
  <div className="flex items-center gap-2 mb-1">
    <DollarSign size={14} />
    <span className="text-xs font-semibold">Revenue</span>
  </div>
  <div className="text-[11px] leading-tight font-semibold">
    <p>
      ₹{stats.todayRevenueINR.toLocaleString('en-IN')}
      <span className="ml-1 text-[10px] opacity-80">INR</span>
    </p>
    <p>
      CA${stats.todayRevenueCAD.toLocaleString('en-CA')}
      <span className="ml-1 text-[10px] opacity-80">CAD</span>
    </p>
  </div>
</div>
            </div>

            {isSuperAdmin && (
              <div className="bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 mt-3">
                <Shield size={14} />
                Super Admin Access
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-all duration-200 group text-blue-600 border-2 border-blue-200 mb-4 hover:border-blue-300"
          >
            <Home size={20} className="flex-shrink-0" />
            <span className="font-semibold">Back to Website</span>
            <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="border-t border-gray-200 mb-4"></div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                    : 'hover:bg-pink-50 text-gray-700 hover:text-pink-600'
                }`}
              >
                <item.icon 
                  size={20} 
                  className={`transition-colors flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-gray-600 group-hover:text-pink-600'
                  }`}
                />
                <span className={`font-medium truncate ${
                  isActive ? 'text-white' : 'group-hover:text-pink-600'
                }`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-white rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg relative overflow-hidden flex-shrink-0">
              {user.photoURL ? (
                <Image 
                  src={user.photoURL} 
                  alt={user.displayName || 'Admin'} 
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <span>{user.displayName?.charAt(0) || 'A'}</span>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-gray-800">
                {user.displayName || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold shadow-sm hover:shadow-md border-2 border-red-200 hover:border-red-300"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-md p-4 flex-shrink-0 border-b sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-pink-600 transition-colors p-2 -ml-2 hover:bg-pink-50 rounded-lg"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍰</span>
              <span className="font-bold text-gray-800 truncate">
                {navItems.find(item => item.href === pathname)?.label || 'Admin Panel'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(stats.pendingOrders + stats.pendingRequests + stats.pendingReviews) > 0 && (
                <div className="relative">
                  <Activity size={24} className="text-pink-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {stats.pendingOrders + stats.pendingRequests + stats.pendingReviews}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
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
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
