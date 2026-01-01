'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmailAuthProvider, linkWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  // Check if user already has password
  const hasPasswordProvider = user?.providerData.some(
    provider => provider.providerId === 'password'
  );

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.email) {
      showError('No user logged in');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (hasPasswordProvider) {
        // User already has password, just update it
        await updatePassword(user, password);
        showSuccess('✅ Password updated successfully!');
      } else {
        // Link email/password credential to existing account
        const credential = EmailAuthProvider.credential(user.email, password);
        await linkWithCredential(user, credential);
        showSuccess('✅ Email/Password sign-in enabled! You can now sign in with email.');
      }

      router.push('/orders');
    } catch (error: any) {
      console.error('Set password error:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        showError('Please sign out and sign in again to set password');
      } else if (error.code === 'auth/weak-password') {
        showError('Password is too weak. Please use at least 6 characters.');
      } else {
        showError(error.message || 'Failed to set password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Lock className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-2xl font-bold mb-4">Please Sign In First</h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-white py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={40} />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {hasPasswordProvider ? 'Update Password' : 'Set Up Password'}
          </h2>
          <p className="text-gray-600">
            {hasPasswordProvider 
              ? 'Change your password for email sign-in'
              : 'Enable email/password sign-in for your account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Current Sign-in Method */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 mb-2">Current Account</p>
            <p className="text-sm text-blue-800">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.providerData.map((provider) => (
                <span
                  key={provider.providerId}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold"
                >
                  {provider.providerId === 'google.com' ? 'Google' : provider.providerId}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}

            {password && password.length > 0 && password.length < 6 && (
              <p className="text-sm text-red-600">Password must be at least 6 characters</p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Setting up...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  {hasPasswordProvider ? 'Update Password' : 'Enable Email Sign-In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <p className="text-sm text-green-800">
              <span className="font-semibold">✓ Benefit:</span> After setting a password, 
              you&apos;ll be able to sign in with either Google or Email/Password.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-pink-600 font-medium"
          >
            <ArrowLeft size={18} />
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
