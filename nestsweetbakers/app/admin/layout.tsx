'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
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
  FileText
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/');
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium text-sm sm:text-base">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Package, label: 'Products', href: '/admin/products' },
    { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
    { icon: MessageSquare, label: 'Custom Requests', href: '/admin/custom-requests' },
    { icon: Star, label: 'Reviews', href: '/admin/reviews' },
    { icon: ImageIcon, label: 'Hero Slides', href: '/admin/hero-slides' },
    { icon: FileText, label: 'Testimonials', href: '/admin/testimonials' },
    ...(isSuperAdmin ? [{ icon: Shield, label: 'User Management', href: '/admin/users' }] : []),
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen z-50 w-64 sm:w-72 lg:w-64 xl:w-72
        bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-pink-600 to-purple-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">🍰</span>
              <div>
                <span className="font-bold text-lg sm:text-xl block leading-tight">Admin Panel</span>
                {isSuperAdmin && (
                  <span className="text-[10px] sm:text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold mt-1 inline-block">
                    Super Admin
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden hover:bg-white/10 p-1.5 rounded transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-300">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group text-blue-600 border border-blue-200 mb-3"
          >
            <Home size={18} className="flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Back to Website</span>
          </Link>

          <div className="border-t border-gray-200 my-2"></div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-pink-50 text-pink-600 shadow-sm' 
                    : 'hover:bg-pink-50 text-gray-700 hover:text-pink-600'
                }`}
              >
                <item.icon 
                  size={18} 
                  className={`transition-colors flex-shrink-0 ${
                    isActive ? 'text-pink-600' : 'text-gray-600 group-hover:text-pink-600'
                  }`}
                />
                <span className={`font-medium text-sm sm:text-base truncate ${
                  isActive ? 'text-pink-600' : 'group-hover:text-pink-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 px-3 sm:px-4 py-2 sm:py-3 bg-white rounded-lg shadow-sm">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold relative overflow-hidden flex-shrink-0">
              {user.photoURL ? (
                <Image 
                  src={user.photoURL} 
                  alt={user.displayName || 'Admin'} 
                  width={40}
                  height={40}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm sm:text-base">{user.displayName?.charAt(0) || 'A'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm truncate text-gray-800">
                {user.displayName || 'Admin'}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm p-3 sm:p-4 flex-shrink-0 border-b sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-pink-600 transition-colors p-2 -ml-2"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <span className="font-semibold text-gray-800 text-sm sm:text-base truncate px-2">
              {navItems.find(item => item.href === pathname)?.label || 'Admin Panel'}
            </span>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
