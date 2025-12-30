'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldOff, Search, Mail, User, Calendar } from 'lucide-react';

export default function UserManagementPage() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchData();
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      const [usersSnap, adminsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'admins')),
      ]);

      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const adminIds = new Set(adminsSnap.docs.map(doc => doc.id));

      setUsers(usersData);
      setAdmins(adminIds);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${isCurrentlyAdmin ? 'revoke' : 'grant'} admin access?`)) {
      return;
    }

    try {
      if (isCurrentlyAdmin) {
        await deleteDoc(doc(db, 'admins', userId));
        setAdmins(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        await setDoc(doc(db, 'admins', userId), {
          role: 'admin',
          createdAt: serverTimestamp(),
          createdBy: 'superAdmin',
        });
        setAdmins(prev => new Set(prev).add(userId));
      }
      alert(`Admin access ${isCurrentlyAdmin ? 'revoked' : 'granted'} successfully`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <Shield className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only Super Admins can access this page</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage user roles and permissions</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
          <p className="text-gray-500 text-sm sm:text-lg">No users found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredUsers.map((user) => {
            const isAdmin = admins.has(user.id);
            return (
              <div key={user.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">{user.name}</h3>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex-shrink-0">
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={14} className="flex-shrink-0" />
                          {user.email}
                        </span>
                        {user.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="flex-shrink-0" />
                            Joined: {new Date(user.createdAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAdmin(user.id, isAdmin)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base whitespace-nowrap ${
                      isAdmin
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <ShieldOff size={18} className="flex-shrink-0" />
                        <span className="hidden sm:inline">Revoke Admin</span>
                        <span className="sm:hidden">Revoke</span>
                      </>
                    ) : (
                      <>
                        <Shield size={18} className="flex-shrink-0" />
                        <span className="hidden sm:inline">Make Admin</span>
                        <span className="sm:hidden">Grant</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
