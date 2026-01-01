'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Lock } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';

interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  photoURL: string;
} 

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    photoURL: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          displayName: data.displayName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          photoURL: data.photoURL || ''
        });
      } else {
        setProfile({
          displayName: user.displayName || '',
          email: user.email || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          photoURL: user.photoURL || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [user, router, fetchProfile]);

  async function handleSave() {
    if (!user || !profile) return;

    if (!profile.displayName.trim()) {
      showError('Please enter your name');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        photoURL: profile.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      showSuccess('✅ Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('❌ Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-pink-600 to-purple-600"></div>
          
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between -mt-16 mb-6 gap-4">
              <div className="flex items-end gap-4">
                {profile.photoURL ? (
                  <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
                    <Image
                      src={profile.photoURL}
                      alt={`${profile.displayName || 'User'} profile picture`}
                      fill
                      className="object-cover"
                      sizes="128px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white text-4xl font-bold">
                    {profile.displayName?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                
                <div className="pb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.displayName || 'User'}</h1>
                  <p className="text-gray-600 text-sm md:text-base">{profile.email}</p>
                </div>
              </div>

              <button
                onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                  isEditing 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <X size={20} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit2 size={20} />
                    Edit Profile
                  </>
                )}
              </button>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User size={16} className="inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={e => setProfile({...profile, displayName: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone size={16} className="inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  disabled={!isEditing}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-2" />
                  Address
                </label>
                <textarea
                  value={profile.address}
                  onChange={e => setProfile({...profile, address: e.target.value})}
                  disabled={!isEditing}
                  placeholder="Street address"
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={e => setProfile({...profile, city: e.target.value})}
                  disabled={!isEditing}
                  placeholder="City"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={e => setProfile({...profile, state: e.target.value})}
                  disabled={!isEditing}
                  placeholder="State"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  value={profile.pincode}
                  onChange={e => setProfile({...profile, pincode: e.target.value})}
                  disabled={!isEditing}
                  placeholder="Pincode"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-pink-600 text-white px-8 py-3 rounded-lg hover:bg-pink-700 transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* My Orders */}
          <button
            onClick={() => router.push('/orders')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition text-left group transform hover:-translate-y-1 duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <h3 className="font-bold">My Orders</h3>
                <p className="text-sm text-gray-600">View order history</p>
              </div>
            </div>
          </button>

          {/* Browse Cakes */}
          <button
            onClick={() => router.push('/cakes')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition text-left group transform hover:-translate-y-1 duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <span className="text-2xl">🍰</span>
              </div>
              <div>
                <h3 className="font-bold">Browse Cakes</h3>
                <p className="text-sm text-gray-600">Explore our collection</p>
              </div>
            </div>
          </button>

          {/* Custom Order */}
          <button
            onClick={() => router.push('/custom-cakes')}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition text-left group transform hover:-translate-y-1 duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                <Edit2 className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold">Custom Order</h3>
                <p className="text-sm text-gray-600">Design your cake</p>
              </div>
            </div>
          </button>

          {/* Set/Change Password - Only for Google users */}
          {user?.providerData.some(p => p.providerId === 'google.com') && (
            <button
              onClick={() => router.push('/set-password')}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition text-left group transform hover:-translate-y-1 duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <Lock className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold">
                    {user?.providerData.some(p => p.providerId === 'password')
                      ? 'Change Password'
                      : 'Set Password'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {user?.providerData.some(p => p.providerId === 'password')
                      ? 'Update your password'
                      : 'Enable email sign-in'}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Account Settings - Only for non-Google users */}
          {!user?.providerData.some(p => p.providerId === 'google.com') && (
            <button
              onClick={() => router.push('/settings')}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition text-left group transform hover:-translate-y-1 duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <User className="text-gray-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold">Settings</h3>
                  <p className="text-sm text-gray-600">Account preferences</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
