'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  }, []);

  // Check if user is admin or superAdmin
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkAdminStatus = async (uid: string) => {
    if (!mounted) return; // ✅ Don't update state if not mounted

    try {
      const [adminDoc, superAdminDoc] = await Promise.all([
        getDoc(doc(db, 'admins', uid)),
        getDoc(doc(db, 'superAdmins', uid))
      ]);

      if (mounted) { // ✅ Check again before setState
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
  };

  // Create/update user profile in Firestore
  const ensureUserProfile = async (currentUser: User) => {
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
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = onAuthStateChanged(
      auth, 
      async (currentUser) => {
        if (!mounted) return; // ✅ Don't update if not mounted

        setUser(currentUser);

        if (currentUser) {
          // Run async operations without blocking
          Promise.all([
            checkAdminStatus(currentUser.uid),
            ensureUserProfile(currentUser)
          ]).catch(err => {
            console.error('Error in auth setup:', err);
          });
        } else {
          if (mounted) {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      }, 
      (error) => {
        console.error('Auth state change error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [checkAdminStatus, mounted]); // ✅ Depend on mounted state

  const signIn = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const resetPassword = async (email: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const signOut = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      await firebaseSignOut(auth);
      if (mounted) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Don't render children until mounted to prevent hydration issues
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
      signOut 
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
