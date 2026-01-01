"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  Shield,
  ShieldOff,
  Search,
  Mail,
  Calendar,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";

type ConfirmAction = "grant" | "revoke" | "delete";

interface ConfirmState {
  show: boolean;
  userId: string;
  action: ConfirmAction;
  userName: string;
}

export default function UserManagementPage() {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admins" | "users">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    show: false,
    userId: "",
    action: "grant",
    userName: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersSnap, adminsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "admins")),
      ]);

      const usersData = usersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const adminIds = new Set(adminsSnap.docs.map((d) => d.id));

      setUsers(usersData);
      setAdmins(adminIds);
    } catch (error) {
      console.error("Error fetching users:", error);
      showError("❌ Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchData();
  }, [isSuperAdmin, fetchData]);

  const closeModal = () =>
    setConfirmModal({
      show: false,
      userId: "",
      action: "grant",
      userName: "",
    });

  const toggleAdmin = async () => {
    const { userId, action } = confirmModal;
    const isCurrentlyAdmin = action === "revoke";

    try {
      if (isCurrentlyAdmin) {
        await deleteDoc(doc(db, "admins", userId));
        setAdmins((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        showSuccess("✅ Admin access revoked successfully");
      } else {
        await setDoc(doc(db, "admins", userId), {
          role: "admin",
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid,
        });
        setAdmins((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        showSuccess("✅ Admin access granted successfully");
      }
      closeModal();
    } catch (error) {
      console.error("Error updating admin status:", error);
      showError("❌ Failed to update admin status");
    }
  };

  const deleteUser = async () => {
    const { userId } = confirmModal;

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      if (admins.has(userId)) {
        await deleteDoc(doc(db, "admins", userId));
        setAdmins((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }

      showSuccess("✅ User deleted successfully");
      closeModal();
    } catch (error) {
      console.error("Error deleting user:", error);
      showError("❌ Failed to delete user");
    }
  };

  const getCreatedAtTime = (u: any): number => {
    const createdAt = u?.createdAt;
    if (!createdAt) return 0;
    // Firestore Timestamp
    if (createdAt.seconds) return createdAt.seconds * 1000;
    // JS Date / ISO string
    return new Date(createdAt).getTime() || 0;
  };

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const totalAdmins = admins.size;
  const newUsersLast7Days = users.filter(
    (u) => now - getCreatedAtTime(u) <= sevenDaysMs
  ).length;

  const visibleUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();

    let list = users.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
    );

    if (roleFilter === "admins") {
      list = list.filter((u) => admins.has(u.id));
    } else if (roleFilter === "users") {
      list = list.filter((u) => !admins.has(u.id));
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.displayName || a.email || "")
          .toLowerCase()
          .localeCompare((b.displayName || b.email || "").toLowerCase());
      }
      const ta = getCreatedAtTime(a);
      const tb = getCreatedAtTime(b);
      return sortBy === "newest" ? tb - ta : ta - tb;
    });

    return list;
  }, [users, admins, searchTerm, roleFilter, sortBy]);

  const openConfirm = (
    user: any,
    action: ConfirmAction,
    disabled: boolean
  ) => {
    if (disabled) return;
    setConfirmModal({
      show: true,
      userId: user.id,
      action,
      userName: user.displayName || user.email || "User",
    });
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-10 md:p-12 text-center animate-scale-in">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="text-red-600" size={48} />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-3">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-slate-300 text-base md:text-lg">
          Only Super Admins can access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-height-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping" />
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-slate-300 font-semibold text-lg">
            Loading users...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div
              className={`w-16 h-16 ${
                confirmModal.action === "delete"
                  ? "bg-red-100"
                  : confirmModal.action === "grant"
                  ? "bg-green-100"
                  : "bg-yellow-100"
              } rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              {confirmModal.action === "delete" ? (
                <Trash2 className="text-red-600" size={32} />
              ) : confirmModal.action === "grant" ? (
                <Shield className="text-green-600" size={32} />
              ) : (
                <ShieldOff className="text-yellow-600" size={32} />
              )}
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-slate-100 mb-2">
              {confirmModal.action === "delete"
                ? "Delete User?"
                : confirmModal.action === "grant"
                ? "Grant Admin Access?"
                : "Revoke Admin Access?"}
            </h3>
            <p className="text-gray-600 dark:text-slate-300 text-center mb-6">
              {confirmModal.action === "delete"
                ? `Are you sure you want to permanently delete ${confirmModal.userName}? This action cannot be undone.`
                : confirmModal.action === "grant"
                ? `Grant admin privileges to ${confirmModal.userName}? They will have access to the admin panel.`
                : `Revoke admin access from ${confirmModal.userName}? They will lose all admin privileges.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={
                  confirmModal.action === "delete" ? deleteUser : toggleAdmin
                }
                className={`flex-1 px-4 py-3 ${
                  confirmModal.action === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmModal.action === "grant"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                } text-white rounded-xl font-semibold transition-all`}
              >
                {confirmModal.action === "delete"
                  ? "Delete"
                  : confirmModal.action === "grant"
                  ? "Grant Access"
                  : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2 flex items-center gap-2">
            <Users size={16} />
            Manage user roles and permissions
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 px-4 py-3 rounded-xl">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
              Total Users
            </p>
            <p className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {users.length}
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-slate-800 dark:to-slate-700 px-4 py-3 rounded-xl">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
              Admins
            </p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {totalAdmins}
            </p>
          </div>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-slate-800 dark:to-slate-700 px-4 py-3 rounded-xl">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
              New (7 days)
            </p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {newUsersLast7Days}
            </p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-4 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "admins", label: "Admins" },
              { id: "users", label: "Non-admins" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  setRoleFilter(f.id as "all" | "admins" | "users")
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  roleFilter === f.id
                    ? "bg-pink-600 text-white border-pink-600"
                    : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-slate-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "oldest" | "name")
              }
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-gray-700 dark:text-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users list */}
      {visibleUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-10 md:p-12 text-center">
          <Users className="mx-auto text-gray-300 dark:text-slate-600 mb-4" size={64} />
          <p className="text-gray-500 dark:text-slate-300 text-lg font-semibold">
            No users found
          </p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-2">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleUsers.map((user) => {
            const isAdmin = admins.has(user.id);
            const isCurrentUser = user.id === currentUser?.uid;
            const createdAtTime = getCreatedAtTime(user);

            const disableDangerActions = isCurrentUser;

            return (
              <div
                key={user.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1 animate-fade-in"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          width={64}
                          height={64}
                          className="w-full h-full rounded-full object-cover ring-4 ring-pink-100"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-pink-100">
                          {user.displayName?.charAt(0) ||
                            user.email?.charAt(0) ||
                            "U"}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center ring-2 ring-white">
                          <Shield size={14} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-lg md:text-xl text-gray-800 dark:text-slate-100 truncate">
                          {user.displayName || "Unnamed User"}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-2xs font-semibold">
                            You
                          </span>
                        )}
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                            <Shield size={12} />
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Mail size={14} className="flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        {createdAtTime > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="flex-shrink-0" />
                            Joined{" "}
                            {new Date(createdAtTime).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() =>
                        openConfirm(
                          user,
                          isAdmin ? "revoke" : "grant",
                          disableDangerActions
                        )
                      }
                      disabled={disableDangerActions}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                        disableDangerActions
                          ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700"
                          : isAdmin
                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-2 border-yellow-200"
                          : "bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-200"
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <ShieldOff size={18} />
                          <span className="hidden sm:inline">Revoke</span>
                        </>
                      ) : (
                        <>
                          <Shield size={18} />
                          <span className="hidden sm:inline">Make Admin</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        openConfirm(user, "delete", disableDangerActions)
                      }
                      disabled={disableDangerActions}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 border-2 ${
                        disableDangerActions
                          ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700"
                          : "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                      }`}
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
