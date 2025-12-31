'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { Package, Search, Loader2, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function ClaimOrderPage() {
  const [orderRef, setOrderRef] = useState('');
  const [claiming, setClaiming] = useState(false);
  
  const { user, claimOrderById } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const router = useRouter();

  const handleClaimOrder = async () => {
    if (!user) {
      showError('Please sign in to claim your order');
      router.push('/login?redirect=/claim-order');
      return;
    }

    if (!orderRef.trim()) {
      showError('Please enter your Order ID');
      return;
    }

    setClaiming(true);
    try {
      const success = await claimOrderById(orderRef, user.uid);
      
      if (success) {
        showSuccess('✅ Order successfully added to your account!');
        setTimeout(() => {
          router.push('/orders');
        }, 2000);
      } else {
        showError('Order not found or already claimed by another account');
      }
    } catch (error) {
      console.error('Error claiming order:', error);
      showError('Failed to claim order. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="text-pink-600" size={48} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Claim Your Order
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Add a guest order to your account by entering the Order ID
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {!user ? (
            // Not logged in
            <div className="text-center py-8">
              <AlertCircle className="mx-auto mb-4 text-yellow-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
              <p className="text-gray-600 mb-6">
                You need to sign in to claim orders to your account
              </p>
              <Link
                href="/login?redirect=/claim-order"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <LogIn size={20} />
                Sign In
              </Link>
            </div>
          ) : (
            // Logged in
            <>
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  <CheckCircle className="inline mr-2" size={16} />
                  Signed in as <strong>{user.email}</strong>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Order ID / Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ORDMJU123ABC"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase text-lg"
                    disabled={claiming}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the Order ID from your email or order confirmation
                  </p>
                </div>

                <button
                  onClick={handleClaimOrder}
                  disabled={claiming || !orderRef}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Claiming Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Claim Order
                    </>
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-8 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <h3 className="font-bold text-purple-900 mb-2">How it works</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Enter your Order ID from guest checkout</li>
                  <li>• Click &quot;Claim Order&quot; to add it to your account</li>
                  <li>• View and track all orders in one place</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/track-order" className="text-pink-600 hover:underline block">
            Track Order Without Signing In
          </Link>
          <Link href="/orders" className="text-gray-600 hover:underline block">
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
