'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Mail, Lock, Loader2, Package, AlertCircle } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signInWithEmail } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [user, router, searchParams]);

  const getErrorMessage = (error: any) => {
    const errorCode = error.code || '';
    
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return null; // Don't show error for user cancellation
      case 'auth/popup-blocked':
        return 'Popup blocked. Please allow popups for this site.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials or sign up first.';
      case 'auth/user-not-found':
        return 'No account found. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method.';
      default:
        return error.message || 'Failed to sign in. Please try again.';
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      showSuccess('✅ Welcome back! Signed in successfully.');
      
      const redirect = searchParams.get('redirect') || '/';
      
      // Show info about linking orders
      setTimeout(() => {
        showInfo('Checking for guest orders to link...');
      }, 500);
      
      router.push(redirect);
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = getErrorMessage(err);
      if (errorMsg) showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const result = await signIn();
      
      if (result.success) {
        showSuccess('✅ Welcome! Signed in with Google successfully.');
        
        const redirect = searchParams.get('redirect') || '/';
        
        // Show info about linking orders
        setTimeout(() => {
          showInfo('Checking for guest orders to link...');
        }, 500);
        
        router.push(redirect);
      } else {
        // Don't show error if user cancelled
        if (!result.userCancelled) {
          const errorMsg = getErrorMessage({ code: result.error });
          if (errorMsg) showError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMsg = getErrorMessage(err);
      if (errorMsg) showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍰</div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-600">Sign in to your NestSweets account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-pink-600 focus:ring-pink-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {/* Guest Order Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Have a guest order?
                </p>
                <p className="text-xs text-blue-800 mb-2">
                  Orders made with your email/phone will be automatically linked to your account after sign in
                </p>
                <Link 
                  href="/claim-order"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <Package size={14} />
                  Or claim by Order ID
                </Link>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-pink-600 hover:text-pink-700 font-semibold">
              Sign up
            </Link>
          </p>

          {/* Guest Checkout Option */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">or</p>
            <Link
              href="/cakes"
              className="text-pink-600 font-semibold hover:underline"
            >
              Continue as Guest
            </Link>
          </div>
        </div>

        {/* Additional Links */}
        <div className="text-center space-y-2">
          <Link href="/track-order" className="block text-sm text-gray-600 hover:text-pink-600">
            Track Order Without Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-pink-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
