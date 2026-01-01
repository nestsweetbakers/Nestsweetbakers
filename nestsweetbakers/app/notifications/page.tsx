'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Bell, Package, Cake, CheckCircle, XCircle, Clock, 
  Trash2, Check, Loader2, ShoppingBag, Gift, Star,
  Sparkles, TrendingUp, Tag, Image as ImageIcon, X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';
interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'product' | 'general' | 'custom_request' | 'review' | 'promotion' | 'system' | 'info' | 'success' | 'warning';
  title: string;
  message?: string;
  body?: string;
  read: boolean;
  createdAt: any;
  orderId?: string;
  productId?: string;
  requestId?: string;
  imageUrl?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: any;
}


export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Real-time notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      } as Notification));

      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notif =>
          updateDoc(doc(db, 'notifications', notif.id), { read: true })
        )
      );

      showSuccess('✅ All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('❌ Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      showSuccess('✅ Notification deleted');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      showError('❌ Failed to delete notification');
    }
  };

  const deleteAllRead = async () => {
    if (!confirm('Delete all read notifications?')) return;

    try {
      const readNotifications = notifications.filter(n => n.read);
      
      await Promise.all(
        readNotifications.map(notif =>
          deleteDoc(doc(db, 'notifications', notif.id))
        )
      );

      showSuccess('✅ Read notifications deleted');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      showError('❌ Failed to delete notifications');
    }
  };

  const getNotificationIcon = (type: string, priority?: string) => {
    const iconProps = { size: 24, className: "flex-shrink-0" };
    
    switch (type) {
      case 'order':
        return <Package {...iconProps} className="text-blue-600" />;
      case 'product':
        return <Cake {...iconProps} className="text-pink-600" />;
      case 'custom_request':
        return <Gift {...iconProps} className="text-purple-600" />;
      case 'review':
        return <Star {...iconProps} className="text-yellow-600" />;
      case 'promotion':
        return <Tag {...iconProps} className="text-red-600" />;
      case 'system':
        return <Sparkles {...iconProps} className="text-indigo-600" />;
      default:
        return <Bell {...iconProps} className="text-gray-600" />;
        case 'info':
        case 'success':
       case 'warning':
  return <Bell {...iconProps} className="text-gray-600" />;

    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">Delete Notification?</h3>
            <p className="text-gray-600 text-center mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNotification(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="text-pink-600" size={40} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-gray-600 mt-1">Stay updated with your orders and offers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 mb-6 border-2 border-white/50">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All <span className="ml-1 opacity-75">({notifications.length})</span>
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread <span className="ml-1 opacity-75">({unreadCount})</span>
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                  filter === 'read'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Read <span className="ml-1 opacity-75">({notifications.length - unreadCount})</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full lg:w-auto">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold text-sm border-2 border-blue-200"
                >
                  <Check size={16} />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.filter(n => n.read).length > 0 && (
                <button
                  onClick={deleteAllRead}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold text-sm border-2 border-red-200"
                >
                  <Trash2 size={16} />
                  <span>Delete read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border-2 border-white/50 animate-scale-up">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="text-pink-600" size={48} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-800">No notifications</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filter === 'unread' 
                ? "You're all caught up! 🎉" 
                : "You don't have any notifications yet. Check back later!"}
            </p>
            <Link
              href="/cakes"
              className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg"
            >
              Browse Cakes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notif, index) => (
              <div
                key={notif.id}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer border-2 animate-slide-up ${
                  !notif.read ? 'border-l-4 border-l-pink-600' : 'border-white/50'
                } ${getPriorityColor(notif.priority)}`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => !notif.read && markAsRead(notif.id)}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${
                      !notif.read ? 'bg-pink-100' : 'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notif.type, notif.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{notif.title}</h3>
                          {notif.priority === 'high' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                              <TrendingUp size={12} />
                              Priority
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notif.read && (
                            <span className="w-3 h-3 bg-pink-600 rounded-full animate-pulse"></span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(notif.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                      
                     <p className="text-gray-700 mb-3 leading-relaxed"> {notif.message || notif.body} </p>


                      {/* Image Preview */}
                      {notif.imageUrl && (
                        <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden mb-3 border-2 border-gray-200">
                          <Image
                            src={notif.imageUrl}
                            alt="Notification image"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 600px"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock size={14} />
                          {notif.createdAt.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {notif.actionUrl && (
                          <Link
                            href={notif.actionUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold text-sm shadow-md"
                          >
                            <span>View Details</span>
                            <TrendingUp size={14} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
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
        
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
