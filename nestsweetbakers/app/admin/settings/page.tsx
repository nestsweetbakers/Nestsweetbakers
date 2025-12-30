'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { 
  Save, 
  MapPin, 
  Phone, 
  DollarSign, 
  ShoppingCart, 
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface Settings {
  cityName: string;
  allowedPincodes: string;
  businessPhone: string;
  deliveryFee: number;
  minimumOrder: number;
  businessEmail?: string;
  taxRate?: number;
  currency?: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    cityName: '',
    allowedPincodes: '',
    businessPhone: '',
    deliveryFee: 0,
    minimumOrder: 500,
    businessEmail: '',
    taxRate: 0,
    currency: 'INR',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const docRef = doc(db, 'settings', 'business');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings({
          cityName: data.cityName || '',
          allowedPincodes: data.allowedPincodes || '',
          businessPhone: data.businessPhone || '',
          deliveryFee: data.deliveryFee || 0,
          minimumOrder: data.minimumOrder || 500,
          businessEmail: data.businessEmail || '',
          taxRate: data.taxRate || 0,
          currency: data.currency || 'INR',
        });
      } else {
        // Create default settings if they don't exist
        const defaultSettings: Settings = {
          cityName: process.env.NEXT_PUBLIC_CITY_NAME || '',
          allowedPincodes: process.env.NEXT_PUBLIC_CITY_PINCODES || '',
          businessPhone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '',
          deliveryFee: 0,
          minimumOrder: 500,
          businessEmail: '',
          taxRate: 0,
          currency: 'INR',
        };
        await setDoc(docRef, defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showError('❌ Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: keyof Settings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      showInfo('ℹ️ No changes to save');
      return;
    }

    setConfirmModal(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'business');
      await updateDoc(docRef, { ...settings });
      showSuccess('✅ Settings saved successfully!');
      setHasChanges(false);
      setConfirmModal(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="text-blue-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Save Settings?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to save these changes? This will update your business settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Business Settings
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <SettingsIcon size={16} />
            Configure your business information and preferences
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg border-2 border-yellow-200">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold">Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 mb-1">Important Information</h3>
            <p className="text-sm text-gray-600">
              These settings control core aspects of your business. Changes will affect order processing, 
              delivery calculations, and customer experience. Make sure all information is accurate.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Location & Delivery</h2>
              <p className="text-sm text-gray-600">Service area configuration</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              City Name *
            </label>
            <input
              type="text"
              value={settings.cityName}
              onChange={(e) => handleChange('cityName', e.target.value)}
              placeholder="e.g., Narnaund"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Allowed Pincodes *
              <span className="text-xs text-gray-500 ml-2">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={settings.allowedPincodes}
              onChange={(e) => handleChange('allowedPincodes', e.target.value)}
              placeholder="143416,143417,143418"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Orders will only be accepted from these pincodes
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign size={16} />
              Delivery Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              value={settings.deliveryFee}
              onChange={(e) => handleChange('deliveryFee', Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Business Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Business Information</h2>
              <p className="text-sm text-gray-600">Contact & order settings</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Phone size={16} />
              WhatsApp Number *
            </label>
            <input
              type="tel"
              value={settings.businessPhone}
              onChange={(e) => handleChange('businessPhone', e.target.value)}
              placeholder="919876543210"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., 91 for India)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={settings.businessEmail}
              onChange={(e) => handleChange('businessEmail', e.target.value)}
              placeholder="contact@nestsweets.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Minimum Order Amount (₹) *
            </label>
            <input
              type="number"
              min="0"
              value={settings.minimumOrder}
              onChange={(e) => handleChange('minimumOrder', Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.taxRate}
              onChange={(e) => handleChange('taxRate', Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Current Settings Preview */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-pink-100">
        <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="text-pink-600" size={24} />
          Current Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Service Area</p>
            <p className="font-bold text-gray-800">{settings.cityName || 'Not set'}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Delivery Fee</p>
            <p className="font-bold text-gray-800">₹{settings.deliveryFee}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Min. Order</p>
            <p className="font-bold text-gray-800">₹{settings.minimumOrder}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Tax Rate</p>
            <p className="font-bold text-gray-800">{settings.taxRate}%</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Contact</p>
            <p className="font-bold text-gray-800 text-sm truncate">{settings.businessPhone || 'Not set'}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Pincodes</p>
            <p className="font-bold text-gray-800 text-sm truncate">{settings.allowedPincodes || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform ${
            hasChanges && !saving
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save size={24} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-scale-up {
          animation: scale-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
