'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Bell,
  Star,
  MessageSquare,
  Calendar,
  Activity,
  ShoppingCart,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenueINR: number;
  totalRevenueCAD: number;
  customRequests: number;
  totalUsers: number;
  todayOrders: number;
  todayRevenueINR: number;
  todayRevenueCAD: number;
  newUsers: number;
  averageOrderValueINR: number;
  averageOrderValueCAD: number;
}


export default function AdminDashboard() {
 const [stats, setStats] = useState<Stats>({
  totalProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalRevenueINR: 0,
  totalRevenueCAD: 0,
  customRequests: 0,
  totalUsers: 0,
  todayOrders: 0,
  todayRevenueINR: 0,
  todayRevenueCAD: 0,
  newUsers: 0,
  averageOrderValueINR: 0,
  averageOrderValueCAD: 0,
});

  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const { showSuccess } = useToast();

  useEffect(() => {
    fetchDashboardData();
    showSuccess('🎉 Welcome back, Admin!');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
  try {
    const [productsSnap, ordersSnap, requestsSnap, usersSnap, reviewsSnap] =
      await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'customRequests')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'reviews')),
      ]);

    const orders = ordersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const products = productsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Pending orders
    const pendingCount = orders.filter(
      (o: any) => o.status === 'pending'
    ).length;

    // Total revenue split by currency
    let totalRevenueINR = 0;
    let totalRevenueCAD = 0;

    orders.forEach((o: any) => {
      const amount = o.total ?? o.totalAmount ?? 0;
      const currency = (o.currency || 'INR') as 'INR' | 'CAD';
      if (currency === 'CAD') totalRevenueCAD += amount;
      else totalRevenueINR += amount;
    });

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrdersArr = orders.filter((o: any) => {
      const createdAt = o.createdAt?.toDate
        ? o.createdAt.toDate()
        : new Date(o.createdAt);
      return createdAt >= today;
    });

    let todayRevenueINR = 0;
    let todayRevenueCAD = 0;

    todayOrdersArr.forEach((o: any) => {
      const amount = o.total ?? o.totalAmount ?? 0;
      const currency = (o.currency || 'INR') as 'INR' | 'CAD';
      if (currency === 'CAD') todayRevenueCAD += amount;
      else todayRevenueINR += amount;
    });

    // New users (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsers = users.filter((u: any) => {
      const joinDate = u.createdAt?.toDate
        ? u.createdAt.toDate()
        : new Date(u.createdAt);
      return joinDate >= lastWeek;
    }).length;

    // Average order value per currency
    const ordersINR = orders.filter(
      (o: any) => (o.currency || 'INR') === 'INR'
    );
    const ordersCAD = orders.filter(
      (o: any) => o.currency === 'CAD'
    );

    const avgOrderValueINR =
      ordersINR.length > 0 ? totalRevenueINR / ordersINR.length : 0;
    const avgOrderValueCAD =
      ordersCAD.length > 0 ? totalRevenueCAD / ordersCAD.length : 0;

    // Recent orders (normalized fields)
    const recentOrdersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const recentOrdersSnap = await getDocs(recentOrdersQuery);
    const recent = recentOrdersSnap.docs.map((doc) => {
      const data = doc.data() as any;
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt);
      const displayName =
        data.customerName ||
        data.userName ||
        data.customerInfo?.name ||
        'Customer';
      const displayEmail =
        data.customerEmail ||
        data.userEmail ||
        data.customerInfo?.email ||
        '';
      const displayTotal = data.total ?? data.totalAmount ?? 0;
      const displayCurrency = (data.currency || 'INR') as 'INR' | 'CAD';

      return {
        id: doc.id,
        ...data,
        createdAt,
        displayName,
        displayEmail,
        displayTotal,
        displayCurrency,
      };
    });

    // Top products by item count in orders.items[]
    const productOrderCount = new Map<string, number>();
    orders.forEach((order: any) => {
      const items = order.items || [];
      items.forEach((item: any) => {
        if (item.cakeId) {
          const qty = item.quantity ?? 1;
          productOrderCount.set(
            item.cakeId,
            (productOrderCount.get(item.cakeId) || 0) + qty
          );
        }
      });
    });

    const topProds = products
      .map((p: any) => ({
        ...p,
        orderCount: productOrderCount.get(p.id) || 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    // Recent activities (orders + reviews)
    const activities = [
      ...recent.slice(0, 3).map((order: any) => ({
        type: 'order',
        message: `New order from ${
          order.displayName ||
          order.customerName ||
          order.userName ||
          'Customer'
        }`,
        time: order.createdAt,
        icon: ShoppingCart,
        color: 'bg-green-100 text-green-600',
      })),
      ...reviewsSnap.docs.slice(0, 2).map((doc: any) => {
        const review = doc.data();
        const time = review.createdAt;
        return {
          type: 'review',
          message: `New review: ${review.rating}⭐ from ${
            review.userName || 'Customer'
          }`,
          time,
          icon: Star,
          color: 'bg-yellow-100 text-yellow-600',
        };
      }),
    ]
      .sort((a, b) => {
        const timeA = a.time?.toDate
          ? a.time.toDate()
          : new Date(a.time);
        const timeB = b.time?.toDate
          ? b.time.toDate()
          : new Date(b.time);
        return timeB.getTime() - timeA.getTime();
      })
      .slice(0, 5);

    setStats({
      totalProducts: productsSnap.size,
      totalOrders: ordersSnap.size,
      pendingOrders: pendingCount,
      totalRevenueINR,
      totalRevenueCAD,
      customRequests: requestsSnap.size,
      totalUsers: usersSnap.size,
      todayOrders: todayOrdersArr.length,
      todayRevenueINR,
      todayRevenueCAD,
      newUsers,
      averageOrderValueINR: avgOrderValueINR,
      averageOrderValueCAD: avgOrderValueCAD,
    });

    setRecentOrders(recent);
    setRecentActivities(activities);
    setTopProducts(topProds);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  } finally {
    setLoading(false);
  }
};


  const statCards = [
    {
  title: 'Total Revenue',
  value: `₹${stats.totalRevenueINR.toLocaleString()} / CA$${stats.totalRevenueCAD.toLocaleString()}`,
  subtitle: `Avg: ₹${Math.round(stats.averageOrderValueINR).toLocaleString()} / CA$${Math.round(stats.averageOrderValueCAD).toLocaleString()}`,
  icon: DollarSign,
  color: 'from-purple-500 to-purple-600',
  trend: '+12.5%',
  trendUp: true,
  link: '/admin/orders',
},

    {
      title: 'Total Orders',
      value: stats.totalOrders,
      subtitle: `Today: ${stats.todayOrders}`,
      icon: ShoppingBag,
      color: 'from-green-500 to-green-600',
      trend: '+8.2%',
      trendUp: true,
      link: '/admin/orders',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      subtitle: 'Needs attention',
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      trend: stats.pendingOrders > 5 ? 'High' : 'Normal',
      trendUp: false,
      link: '/admin/orders?status=pending',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      subtitle: 'Active listings',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      trend: '+3',
      trendUp: true,
      link: '/admin/products',
    },
    {
      title: 'Custom Requests',
      value: stats.customRequests,
      subtitle: 'Pending review',
      icon: Gift,
      color: 'from-pink-500 to-pink-600',
      trend: 'New',
      trendUp: true,
      link: '/admin/custom-requests',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `New: ${stats.newUsers}`,
      icon: Users,
      color: 'from-indigo-500 to-indigo-600',
      trend: '+15.3%',
      trendUp: true,
      link: '/admin/users',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'processing':
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping" />
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 font-semibold text-lg">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/orders?status=pending"
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <Bell size={20} />
            {stats.pendingOrders} Pending
          </Link>
          <Link
            href="/admin/custom-requests"
            className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <Gift size={20} />
            Requests
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Link
            key={stat.title}
            href={stat.link}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 transform hover:-translate-y-2 group relative overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient Background Effect */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl md:text-4xl font-bold text-gray-800 mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {stat.trendUp ? (
                  <ArrowUpRight className="text-green-500" size={16} />
                ) : (
                  <ArrowDownRight className="text-red-500" size={16} />
                )}
                <span
                  className={`text-sm font-semibold ${
                    stat.trendUp ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {stat.trend}
                </span>
                <span className="text-gray-400 text-sm">
                  vs last month
                </span>
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-gray-100 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Recent Orders
                </h2>
                <p className="text-sm text-gray-600">
                  Latest customer orders
                </p>
              </div>
            </div>
            <Link
              href="/admin/orders"
              className="text-pink-600 hover:text-pink-700 font-semibold text-sm flex items-center gap-1 group"
            >
              View All
              <ArrowUpRight
                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                size={16}
              />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag
                className="mx-auto text-gray-300 mb-4"
                size={48}
              />
              <p className="text-gray-500">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/admin/orders`}
                  className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-pink-200 hover:bg-pink-50 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="text-pink-600" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {order.displayName}
                      </p>
                      {order.displayEmail && (
                        <p className="text-sm text-gray-600 truncate">
                          {order.displayEmail}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                   <p className="font-bold text-gray-800 text-lg mb-1">
  {order.displayCurrency === 'CAD' ? 'CA$' : '₹'}
  {order.displayTotal.toLocaleString()}
</p>

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Activity Feed
              </h2>
              <p className="text-sm text-gray-600">Recent updates</p>
            </div>
          </div>

          <div className="space-y-4">
            {recentActivities.map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 group"
              >
                <div
                  className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                >
                  <activity.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(activity.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Top Performing Products
              </h2>
              <p className="text-sm text-gray-600">
                Best sellers this month
              </p>
            </div>
          </div>
          <Link
            href="/admin/products"
            className="text-pink-600 hover:text-pink-700 font-semibold text-sm flex items-center gap-1 group"
          >
            View All
            <ArrowUpRight
              className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
              size={16}
            />
          </Link>
        </div>

        {topProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package
              className="mx-auto text-gray-300 mb-4"
              size={48}
            />
            <p className="text-gray-500">No product data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topProducts.map((product: any, index: number) => (
              <Link
                key={product.id}
                href={`/admin/products`}
                className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 hover:shadow-lg transition-all group overflow-hidden"
              >
                <div className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  #{index + 1}
                </div>
                <div className="mb-3">
                  <div className="w-full aspect-square bg-white rounded-lg overflow-hidden mb-3">
                    {product.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {product.orderCount} orders
                  </p>
                 <p className="text-sm font-bold text-pink-600">
  {product.currency === 'CAD' ? 'CA$' : '₹'}
  {product.basePrice}
</p>

                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/products/new"
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-all text-center group"
          >
            <Package
              className="mx-auto mb-2 group-hover:scale-110 transition-transform"
              size={32}
            />
            <p className="font-semibold text-sm">Add Product</p>
          </Link>
          <Link
            href="/admin/orders"
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-all text-center group"
          >
            <Eye
              className="mx-auto mb-2 group-hover:scale-110 transition-transform"
              size={32}
            />
            <p className="font-semibold text-sm">View Orders</p>
          </Link>
          <Link
            href="/admin/reviews"
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-all text-center group"
          >
            <MessageSquare
              className="mx-auto mb-2 group-hover:scale-110 transition-transform"
              size={32}
            />
            <p className="font-semibold text-sm">Reviews</p>
          </Link>
          <Link
            href="/admin/settings"
            className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-all text-center group"
          >
            <Activity
              className="mx-auto mb-2 group-hover:scale-110 transition-transform"
              size={32}
            />
            <p className="font-semibold text-sm">Settings</p>
          </Link>
        </div>
      </div>

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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
