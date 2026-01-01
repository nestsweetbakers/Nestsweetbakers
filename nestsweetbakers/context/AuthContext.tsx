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
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
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
  linkGuestOrders: (userId: string, email?: string, phone?: string) => Promise<number>;
  claimOrderByRef: (orderRef: string, userId: string) => Promise<boolean>;
    claimOrderById: (orderId: string) => Promise<boolean>; // ✅
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

 // ✅ FIXED: Link guest orders using root-level fields
const linkGuestOrders = useCallback(async (
  userId: string, 
  email?: string, 
  phone?: string
): Promise<number> => {
  try {
    console.log('🔗 Attempting to link guest orders...', { userId, email, phone });
    
    const batch = writeBatch(db);
    let linkedCount = 0;
    const orderIds = new Set<string>();

    // Try to get guest orders from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const guestOrders = JSON.parse(localStorage.getItem('guestOrders') || '[]');
        console.log('📦 Found guest orders in localStorage:', guestOrders);
        
        for (const guestOrder of guestOrders) {
          if (guestOrder.orderId) {
            orderIds.add(guestOrder.orderId);
          }
        }
      } catch (e) {
        console.error('Error parsing localStorage:', e);
      }
    }

    // ✅ Query orders by email using ROOT LEVEL field
    if (email) {
      try {
        const emailQuery = query(
          collection(db, 'orders'),
          where('userEmail', '==', email), // ✅ Changed from customerInfo.email
          where('isGuest', '==', true)
        );
        const emailSnapshot = await getDocs(emailQuery);
        console.log(`📧 Found ${emailSnapshot.size} orders by email`);
        emailSnapshot.forEach(doc => orderIds.add(doc.id));
      } catch (error: any) {
        console.error('Error querying by email:', error);
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index needed for userEmail. Check console for link.');
        }
      }
    }

    // ✅ Query orders by phone using ROOT LEVEL field
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      try {
        const phoneQuery = query(
          collection(db, 'orders'),
          where('userPhone', '==', cleanPhone), // ✅ Changed from customerInfo.phone
          where('isGuest', '==', true)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        console.log(`📱 Found ${phoneSnapshot.size} orders by phone`);
        phoneSnapshot.forEach(doc => orderIds.add(doc.id));
      } catch (error: any) {
        console.error('Error querying by phone:', error);
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index needed for userPhone. Check console for link.');
        }
      }
    }

    console.log(`🎯 Total unique orders found: ${orderIds.size}`);

    // Update all found orders
    for (const orderId of orderIds) {
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        userId,
        isGuest: false,
        linkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      linkedCount++;
    }

    // Link custom cake requests if email provided
    if (email) {
      try {
        const customQuery = query(
          collection(db, 'customCakeRequests'),
          where('email', '==', email), // ✅ This is already root level
          where('isGuest', '==', true)
        );
        const customSnapshot = await getDocs(customQuery);
        console.log(`🎂 Found ${customSnapshot.size} custom requests by email`);
        
        customSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            userId,
            isGuest: false,
            linkedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          linkedCount++;
        });
      } catch (error: any) {
        console.error('Error linking custom requests:', error);
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index needed. Check console for link.');
        }
      }
    }

    if (linkedCount > 0) {
  await batch.commit();
  console.log(`✅ Successfully linked ${linkedCount} orders/requests to user ${userId}`);
  
  // Clear localStorage after successful linking
  if (typeof window !== 'undefined') {
    localStorage.removeItem('guestOrders');
    localStorage.removeItem('guestRequests');
    
    // ✅ NEW: Trigger a page reload or custom event to refresh orders
    window.dispatchEvent(new CustomEvent('ordersLinked', { 
      detail: { count: linkedCount } 
    }));
  }
} else {
  console.log('ℹ️ No guest orders found to link');
}

return linkedCount;

  } catch (error) {
    console.error('❌ Error linking guest orders:', error);
    return 0;
  }
}, []);

// ✅ Claim order by Firestore document ID
const claimOrderById = useCallback(async (orderId: string): Promise<boolean> => {
  if (!user) {
    throw new Error('Must be logged in to claim orders');
  }

  try {
    console.log('🔗 Claiming order by ID:', orderId);
    
    // Get the order
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error('❌ Order not found');
      return false;
    }

    const orderData = orderDoc.data();

    // Check if order is already claimed by another user
    if (orderData.userId && orderData.userId !== 'guest' && orderData.userId !== user.uid) {
      console.error('❌ Order already claimed by another user');
      return false;
    }

    // Check if already claimed by current user
    if (orderData.userId === user.uid && !orderData.isGuest) {
      console.log('ℹ️ Order already claimed by this user');
      return true;
    }

    // Update order with user info
    await updateDoc(orderRef, {
      userId: user.uid,
      userName: user.displayName || user.email || 'User',
      userEmail: user.email,
      isGuest: false,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Successfully claimed order ${orderId}`);
    
    // Trigger refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ordersLinked', { 
        detail: { count: 1 } 
      }));
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error claiming order:', error);
    return false;
  }
}, [user]);


  // ✅ NEW: Claim order by reference code
  const claimOrderByRef = useCallback(async (orderRef: string, userId: string): Promise<boolean> => {
    try {
      console.log('🎫 Attempting to claim order:', orderRef);
      
      const ordersQuery = query(
        collection(db, 'orders'),
        where('orderRef', '==', orderRef.toUpperCase())
      );
      
      const snapshot = await getDocs(ordersQuery);
      
      if (snapshot.empty) {
        console.error('❌ Order not found');
        return false;
      }

      const orderDoc = snapshot.docs[0];
      const orderData = orderDoc.data();

      // Check if order is already claimed by another user
      if (!orderData.isGuest && orderData.userId && orderData.userId !== userId) {
        console.error('❌ Order already claimed by another user');
        return false;
      }

      // Update order
      const batch = writeBatch(db);
      batch.update(doc(db, 'orders', orderDoc.id), {
        userId,
        isGuest: false,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log(`✅ Order ${orderRef} claimed successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error claiming order:', error);
      return false;
    }
  }, []);

  // Create/update user profile in Firestore
  const ensureUserProfile = useCallback(async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);

      const userData = {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || '',
        phone: currentUser.phoneNumber || '',
        photoURL: currentUser.photoURL || '',
        updatedAt: serverTimestamp(),
      };

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
        });
        console.log('✅ User profile created');
      } else {
        await setDoc(userRef, userData, { merge: true });
        console.log('✅ User profile updated');
      }

      // ✅ AUTO-LINK GUEST ORDERS after profile creation/update
      if (currentUser.email || currentUser.phoneNumber) {
        setTimeout(async () => {
          const linkedCount = await linkGuestOrders(
            currentUser.uid,
            currentUser.email || undefined,
            currentUser.phoneNumber || undefined
          );
          
          if (linkedCount > 0) {
            console.log(`✅ Auto-linked ${linkedCount} guest orders on login`);
          }
        }, 1000); // Small delay to ensure profile is saved
      }
    } catch (error) {
      console.error('Error managing user profile:', error);
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

  // Google Sign In
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
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { 
          success: false, 
          error: 'Sign-in cancelled',
          userCancelled: true 
        };
      }
      
      if (error.code === 'auth/popup-blocked') {
        return { 
          success: false, 
          error: 'Popup blocked. Please allow popups for this site.' 
        };
      }
      
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

  // ✅ Email Sign In with better error messages
  const signInWithEmail = async (email: string, password: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please sign up first.');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      
      throw error;
    }
  };

  // Sign Up with Email
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
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      
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
    claimOrderByRef,
    claimOrderById // ✅ ADD THIS LINE
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
