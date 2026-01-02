'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, User, X, ChevronDown, Heart, Shield,
  LayoutDashboard, Bell, Menu, Package, Settings, Users,
  BarChart3, MessageSquare, LogOut, Home, Cake,
  Gift, Info, Phone, Wrench, Sparkles, MapPin, CheckSquare,
  Megaphone  // ✅ add
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useRouter, usePathname } from 'next/navigation';
import { getUnreadNotificationCount } from '@/lib/notificationUtils';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
 const [announcement, setAnnouncement] = useState<any | null>(null);
const [hideAnnouncement, setHideAnnouncement] = useState(false);

  
  const { cartCount, isHydrated } = useCart();
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  // Smart scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      
      setScrolled(currentScrollY > 20);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

// Header announcement (real‑time)
useEffect(() => {
  const q = query(
    collection(db, 'announcements'),
    where('isActive', '==', true),
    where('showOnHeader', '==', true),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      setAnnouncement({ id: docSnap.id, ...(docSnap.data() as any) });
      // do NOT reset hideAnnouncement here
    } else {
      setAnnouncement(null);
    }
  });

  return () => unsubscribe();
}, []);

// Respect previously closed announcement per ID
useEffect(() => {
  if (!announcement) return;

  try {
    const closedId = localStorage.getItem('closedAnnouncementId');
    if (closedId === announcement.id) {
      setHideAnnouncement(true);
    } else {
      setHideAnnouncement(false);
    }
  } catch {
    // ignore storage errors
  }
}, [announcement]);


  // Fetch unread notifications
  useEffect(() => {
    async function fetchUnreadCount() {
      if (user) {
        const count = await getUnreadNotificationCount(user.uid);
        setUnreadCount(count);
      }
    }
    
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdowns on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setSearchOpen(false);
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/cakes', label: 'Cakes', icon: Cake },
    { href: '/custom-cakes', label: 'Custom', icon: Gift },
    { href: '/about', label: 'About', icon: Info },
    { href: '/services', label: 'Services', icon: Wrench },
    { href: '/contact', label: 'Contact', icon: Phone },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/custom-requests', label: 'Custom Requests', icon: Gift },
    { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
    { href: '/admin/content', label: 'Content Management', icon: Sparkles },
     { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/admin/users', label: 'Users', icon: Users, superAdminOnly: true },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const customerLinks = [
    { href: '/profile', label: 'My Profile', icon: User },
    { href: '/orders', label: 'My Orders', icon: Package },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  const quickLinks = [
    { href: '/track-order', label: 'Track Order', icon: MapPin },
    { href: '/claim-order', label: 'Claim Order', icon: CheckSquare, authOnly: true },
  ];

  const handleSignOut = async () => {
    await signOut();
    setUserDropdownOpen(false);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cakes?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isActivePath = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Use settings from hook or fallback
  const businessName = settings.businessName || 'NestSweets';
  const logo = settings.logo;

  const shouldScroll =
  !!announcement?.message && announcement.message.length > 80;

  return (
    <>
      <header
  className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
    headerVisible ? 'translate-y-0' : '-translate-y-full'
  } ${
    scrolled
      ? 'bg-white/95 backdrop-blur-lg shadow-2xl py-1.5'
      : 'bg-white shadow-md py-2'
  }`}
>
  {/* Announcement bar */}
{announcement && !hideAnnouncement && (
  <div className="border-b border-pink-100 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center gap-2 text-xs sm:text-sm">
      <Megaphone size={16} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{announcement.title}</p>
        {announcement.message && (
          <div className="hidden sm:block text-[11px] opacity-90">
            <div className={`min-w-0 ${shouldScroll ? 'overflow-hidden' : ''}`}>
              <div
                className={
                  shouldScroll
                    ? 'inline-block whitespace-nowrap animate-header-marquee'
                    : 'truncate'
                }
              >
                {announcement.message}
              </div>
            </div>
          </div>
        )}
      </div>
      {announcement.link && (
        <Link
          href={announcement.link}
          className="px-2 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-full whitespace-nowrap"
        >
          View
        </Link>
      )}
      <button
        type="button"
        onClick={() => {
          setHideAnnouncement(true);
          if (announcement?.id) {
            try {
              localStorage.setItem('closedAnnouncementId', announcement.id);
            } catch {
              // ignore storage errors
            }
          }
        }}
        className="ml-1 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Close announcement"
      >
        <X size={14} />
      </button>
    </div>
  </div>
)}


  <div className="max-w-7xl mx-auto px-3 sm:px-4">
  

          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-1.5 group relative z-10">
              {logo ? (
                <div  className={`relative transition-all duration-500 ${
    scrolled ? 'w-8 h-8' : 'w-10 h-10'
  } rounded-full bg-white border border-pink-100 overflow-hidden`}
>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
    src={logo}
    alt={businessName}
    className="w-full h-full object-cover group-hover:scale-110 transition-transform rounded-full"
  />
                </div>
              ) : (
              <div
  className={`transition-all duration-500 ${
    scrolled ? 'w-8 h-8 text-xl' : 'w-10 h-10 text-2xl'
  } rounded-full bg-white border border-pink-100 flex items-center justify-center`}
>
                 <span className="inline-block group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
    🍰
  </span>
</div>
              )}
              <div className="overflow-hidden">
                <span className={`font-bold text-pink-600 group-hover:text-pink-700 transition-all duration-300 inline-block group-hover:translate-x-0.5 ${
                  scrolled ? 'text-lg' : 'text-xl'
                }`}>
                  {businessName}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isActivePath(link.href);
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-2.5 xl:px-3 py-1.5 text-sm font-medium transition-all duration-300 group overflow-hidden rounded-lg flex items-center gap-1.5 ${
                      isActive 
                        ? 'text-pink-600 bg-pink-50' 
                        : 'text-gray-700 hover:text-pink-600'
                    }`}
                  >
                    <Icon size={16} className="transition-transform group-hover:scale-110" />
                    <span className="relative z-10">{link.label}</span>
                    {!isActive && (
                      <span className="absolute inset-0 bg-pink-50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-lg"></span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-1">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-1.5 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-110 ${
                  searchOpen ? 'bg-pink-100 text-pink-600 rotate-90' : 'text-gray-700'
                }`}
                aria-label="Search"
              >
                <Search size={scrolled ? 18 : 20} className="transition-all duration-300" />
              </button>

              {/* Track Order */}
              <Link
                href="/track-order"
                className="hidden md:flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                title="Track Order"
              >
                <MapPin size={16} />
                <span className="hidden xl:inline">Track</span>
              </Link>

              {/* Notifications */}
              {user && settings.features.enableReviews && (
                <Link
                  href="/notifications"
                  className="relative p-1.5 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-110 hidden md:block"
                  aria-label="Notifications"
                >
                  <Bell size={scrolled ? 18 : 20} className="text-gray-700 hover:text-pink-600 transition-all duration-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold animate-pulse shadow-lg px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Wishlist */}
              {user && settings.features.enableWishlist && (
                <Link
                  href="/wishlist"
                  className="hidden md:flex p-1.5 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-110 text-gray-700 hover:text-pink-600"
                  aria-label="Wishlist"
                >
                  <Heart size={scrolled ? 18 : 20} className="transition-all duration-300" />
                </Link>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-1.5 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-110 group"
              >
                <ShoppingCart 
                  size={scrolled ? 18 : 20} 
                  className="text-gray-700 group-hover:text-pink-600 transition-all duration-300"
                />
                {isHydrated && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold animate-bounce shadow-lg px-0.5">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="hidden md:flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-105 group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={`avatar-fallback ${user.photoURL ? 'hidden' : 'flex'} items-center justify-center absolute inset-0`}>
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </span>
                      {isAdmin && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center z-10">
                          <Shield size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <ChevronDown 
                      size={14} 
                      className={`transition-transform duration-300 text-gray-600 ${userDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl py-2 z-50 animate-slide-up border border-gray-100 max-h-[80vh] overflow-y-auto">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold relative overflow-hidden">
                              {user.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={user.photoURL} 
                                  alt={user.displayName || 'User'} 
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span className={`avatar-fallback ${user.photoURL ? 'hidden' : 'flex'} items-center justify-center absolute inset-0`}>
                                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{user.displayName || 'User'}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                          {isSuperAdmin && (
                            <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full font-semibold shadow-lg">
                              ⭐ Super Admin
                            </span>
                          )}
                          {isAdmin && !isSuperAdmin && (
                            <span className="inline-block px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full font-semibold shadow-lg">
                              🛡️ Admin
                            </span>
                          )}
                        </div>

                        {/* Admin Panel Links */}
                        {isAdmin && (
                          <>
                            <div className="px-4 py-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Panel</p>
                            </div>
                            {adminLinks
                              .filter(link => !link.superAdminOnly || isSuperAdmin)
                              .map((link) => {
                                const Icon = link.icon;
                                return (
                                  <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-all duration-200 group"
                                    onClick={() => setUserDropdownOpen(false)}
                                  >
                                    <Icon size={18} className="text-purple-600 group-hover:text-purple-700 transition-colors" />
                                    <span className="text-gray-700 group-hover:text-purple-700 transition-colors font-medium">
                                      {link.label}
                                    </span>
                                  </Link>
                                );
                              })}
                            <div className="border-t border-gray-100 my-2"></div>
                          </>
                        )}

                        {/* Customer Links */}
                        <div className="px-4 py-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Account</p>
                        </div>
                        {customerLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-all duration-200 group relative"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <Icon size={18} className="text-gray-600 group-hover:text-pink-600 transition-colors" />
                              <span className="text-gray-700 group-hover:text-pink-600 transition-colors flex-1">
                                {link.label}
                              </span>
                              {link.badge && link.badge > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1">
                                  {link.badge > 9 ? '9+' : link.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}

                        {/* Quick Actions */}
                        <div className="border-t border-gray-100 mt-2">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</p>
                          </div>
                          {quickLinks
                            .filter(link => !link.authOnly || user)
                            .map((link) => {
                              const Icon = link.icon;
                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 group"
                                  onClick={() => setUserDropdownOpen(false)}
                                >
                                  <Icon size={18} className="text-blue-600 group-hover:text-blue-700 transition-colors" />
                                  <span className="text-gray-700 group-hover:text-blue-700 transition-colors">
                                    {link.label}
                                  </span>
                                </Link>
                              );
                            })}
                        </div>

                        {/* Sign Out */}
                        <div className="border-t border-gray-100 mt-2">
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all duration-200 w-full text-left group"
                          >
                            <LogOut size={18} className="text-red-600" />
                            <span className="text-red-600 font-medium">Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-1.5 text-sm rounded-full hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg hover:shadow-xl"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-full hover:bg-pink-50 transition-all duration-300 transform hover:scale-110"
                aria-label="Menu"
              >
                <Menu size={22} className={`transition-all duration-300 ${mobileMenuOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={`overflow-hidden transition-all duration-500 ${
            searchOpen ? 'max-h-16 mt-2' : 'max-h-0'
          }`}>
            <form onSubmit={handleSearch} className="relative animate-slide-up">
              <input
                type="text"
                placeholder="Search for cakes, flavors, occasions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-10 text-sm border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 shadow-lg"
                autoFocus={searchOpen}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={18} />
                </button>
              )}
            </form>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className={`transition-all duration-500 ${scrolled ? 'h-12' : 'h-14'}`} />

      {/* Mobile Menu (keeping existing code for mobile menu) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed top-0 right-0 bottom-0 w-80 bg-white z-50 lg:hidden transform transition-transform duration-500 ease-out shadow-2xl ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          <div className="p-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
    src={logo}
    alt={businessName}
    className="w-10 h-10 object-cover rounded-full bg-white border border-pink-100"
  />
) : (
  <div className="w-10 h-10 rounded-full bg-white border border-pink-100 flex items-center justify-center">
    <span className="text-2xl">🍰</span>
  </div>
)}
                <span className="font-bold text-xl">{businessName}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-300"
              >
                <X size={24} />
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3 py-3 px-4 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-pink-600 font-bold text-lg relative overflow-hidden">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span className={`avatar-fallback ${user.photoURL ? 'hidden' : 'flex'} items-center justify-center absolute inset-0 text-pink-600`}>
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                  {isAdmin && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center z-10">
                      <Shield size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs opacity-90 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white text-pink-600 rounded-xl font-semibold hover:bg-pink-50 transition-all duration-300"
              >
                <User size={20} />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Admin Links */}
            {isAdmin && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Admin Panel</p>
                {adminLinks
                  .filter(link => !link.superAdminOnly || isSuperAdmin)
                  .map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-all duration-300 group font-medium text-purple-700"
                      >
                        <Icon size={20} className="text-purple-600" />
                        {link.label}
                      </Link>
                    );
                  })}
                <div className="border-t border-gray-200 my-2"></div>
              </>
            )}

            {/* Main Navigation */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Navigation</p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isActivePath(link.href);
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group font-medium ${
                    isActive 
                      ? 'bg-pink-100 text-pink-700' 
                      : 'hover:bg-pink-50 text-gray-700 hover:text-pink-600'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-pink-600' : 'text-gray-400 group-hover:text-pink-600'} />
                  {link.label}
                </Link>
              );
            })}

            {/* Quick Actions */}
            <div className="border-t border-gray-200 my-2"></div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Quick Actions</p>
            {quickLinks
              .filter(link => !link.authOnly || user)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-all duration-300 group font-medium text-gray-700 hover:text-blue-600"
                  >
                    <Icon size={20} className="text-blue-500 group-hover:text-blue-600 transition-colors" />
                    {link.label}
                  </Link>
                );
              })}

            {/* User Links */}
            {user && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">My Account</p>
                {customerLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-pink-50 transition-all duration-300 group font-medium text-gray-700 hover:text-pink-600 relative"
                    >
                      <Icon size={20} className="text-gray-400 group-hover:text-pink-600 transition-colors" />
                      <span className="flex-1">{link.label}</span>
                      {link.badge && link.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1">
                          {link.badge > 9 ? '9+' : link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Mobile Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            )}
            <p className="text-center text-xs text-gray-500">
              © {new Date().getFullYear()} {businessName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {scrolled && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 z-40 animate-bounce-slow"
          aria-label="Scroll to top"
        >
          <ChevronDown size={24} className="rotate-180" />
        </button>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
          @keyframes header-marquee {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  .animate-header-marquee {
    animation: header-marquee 15s linear infinite;
  }
      `}</style>
    </>
  );
}
