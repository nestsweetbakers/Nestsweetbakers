'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: () => Promise<{ success: boolean; error?: string; userCancelled?: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  linkGuestOrders: (userId: string, email: string, phone: string) => Promise<number>;
  claimOrderById: (orderId: string, userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check if user is admin or superAdmin
  const checkAdminStatus = useCallback(async (uid: string) => {
    if (!mounted) return;

    try {
      const [adminDoc, superAdminDoc] = await Promise.all([
        getDoc(doc(db, 'admins', uid)),
        getDoc(doc(db, 'superAdmins', uid))
      ]);

      if (mounted) {
        setIsSuperAdmin(superAdminDoc.exists());
        setIsAdmin(adminDoc.exists() || superAdminDoc.exists());
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      if (mounted) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    }
  }, [mounted]);

  // ✅ NEW: Link guest orders to authenticated user
  const linkGuestOrders = useCallback(async (userId: string, email: string, phone: string): Promise<number> => {
    try {
      const batch = writeBatch(db);
      let linkedCount = 0;

      // Find orders by email
      const emailQuery = query(
        collection(db, 'orders'),
        where('userEmail', '==', email),
        where('isGuest', '==', true)
      );
      
      // Find orders by phone
      const phoneQuery = query(
        collection(db, 'orders'),
        where('userPhone', '==', phone),
        where('isGuest', '==', true)
      );

      const [emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(phoneQuery)
      ]);

      // Combine and deduplicate orders
      const orderIds = new Set<string>();
      
      emailSnapshot.forEach(doc => orderIds.add(doc.id));
      phoneSnapshot.forEach(doc => orderIds.add(doc.id));

      // Update all guest orders to link with user
      orderIds.forEach(orderId => {
        batch.update(doc(db, 'orders', orderId), {
          userId,
          isGuest: false,
          linkedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        linkedCount++;
      });

      // Also link custom requests
      const customRequestQuery = query(
        collection(db, 'customRequests'),
        where('email', '==', email),
        where('userId', '==', 'guest')
      );
      
      const customSnapshot = await getDocs(customRequestQuery);
      
      customSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          userId,
          linkedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        linkedCount++;
      });

      if (linkedCount > 0) {
        await batch.commit();
        console.log(`✅ Linked ${linkedCount} orders/requests to user ${userId}`);
      }

      return linkedCount;
    } catch (error) {
      console.error('Error linking guest orders:', error);
      return 0;
    }
  }, []);

  // ✅ NEW: Claim a specific order by ID
  const claimOrderById = useCallback(async (orderRef: string, userId: string): Promise<boolean> => {
    try {
      // Find order by orderRef
      const ordersQuery = query(
        collection(db, 'orders'),
        where('orderRef', '==', orderRef.toUpperCase())
      );
      
      const snapshot = await getDocs(ordersQuery);
      
      if (snapshot.empty) {
        return false;
      }

      const orderDoc = snapshot.docs[0];
      const orderData = orderDoc.data();

      // Check if order is already claimed by another user
      if (!orderData.isGuest && orderData.userId !== userId && !orderData.userId.startsWith('guest_')) {
        console.error('Order already claimed by another user');
        return false;
      }

      // Update order
      await updateDoc(doc(db, 'orders', orderDoc.id), {
        userId,
        isGuest: false,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Order ${orderRef} claimed by user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error claiming order:', error);
      return false;
    }
  }, []);

  // Create/update user profile in Firestore
  const ensureUserProfile = useCallback(async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || '',
          phone: currentUser.phoneNumber || '',
          photoURL: currentUser.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // ✅ AUTO-LINK GUEST ORDERS after user profile creation
      if (currentUser.email) {
        const linkedCount = await linkGuestOrders(
          currentUser.uid,
          currentUser.email,
          currentUser.phoneNumber || ''
        );
        
        if (linkedCount > 0) {
          console.log(`✅ Auto-linked ${linkedCount} guest orders`);
        }
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }, [linkGuestOrders]);

  // Auth state listener
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    const unsubscribe = onAuthStateChanged(
      auth, 
      async (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          try {
            await Promise.all([
              checkAdminStatus(currentUser.uid),
              ensureUserProfile(currentUser)
            ]);
          } catch (err) {
            console.error('Error in auth setup:', err);
          }
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }

        setLoading(false);
      }, 
      (error) => {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [mounted, checkAdminStatus, ensureUserProfile]);

  // ✅ UPDATED: Google Sign In with error handling
  const signIn = async (): Promise<{ success: boolean; error?: string; userCancelled?: boolean }> => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Not in browser environment' };
    }
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // ✅ Handle popup closed by user
      if (error.code === 'auth/popup-closed-by-user') {
        return { 
          success: false, 
          error: 'Sign-in cancelled',
          userCancelled: true 
        };
      }
      
      // Handle popup blocked
      if (error.code === 'auth/popup-blocked') {
        return { 
          success: false, 
          error: 'Popup blocked. Please allow popups for this site.' 
        };
      }
      
      // Handle account exists with different credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        return { 
          success: false, 
          error: 'An account already exists with this email using a different sign-in method.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to sign in. Please try again.' 
      };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        await userCredential.user.reload();
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      await firebaseSignOut(auth);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isSuperAdmin, 
      signIn, 
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      linkGuestOrders,
      claimOrderById
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
