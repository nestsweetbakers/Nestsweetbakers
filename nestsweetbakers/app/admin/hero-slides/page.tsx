'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    id: string;
    title: string;
  }>({ show: false, id: '', title: '' });
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    isActive: true,
    order: 0,
  });

  const fetchSlides = useCallback(async () => {
    try {
      const slidesSnap = await getDocs(collection(db, 'heroSlides'));
      const slidesData = slidesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => a.order - b.order);
      setSlides(slidesData);
    } catch (error) {
      console.error('Error fetching slides:', error);
      showError('❌ Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl) {
      showError('❌ Please upload or provide an image');
      return;
    }

    try {
      if (editingSlide) {
        await updateDoc(doc(db, 'heroSlides', editingSlide.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        showSuccess('✅ Slide updated successfully');
      } else {
        await addDoc(collection(db, 'heroSlides'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        showSuccess('✅ Slide created successfully');
      }
      
      resetForm();
      fetchSlides();
    } catch (error) {
      console.error('Error saving slide:', error);
      showError('❌ Failed to save slide');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'heroSlides', confirmModal.id));
      setSlides(slides.filter(s => s.id !== confirmModal.id));
      showSuccess('✅ Slide deleted successfully');
      setConfirmModal({ show: false, id: '', title: '' });
    } catch (error) {
      console.error('Error deleting slide:', error);
      showError('❌ Failed to delete slide');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'heroSlides', id), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      showSuccess(`✅ Slide ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchSlides();
    } catch (error) {
      console.error('Error toggling slide status:', error);
      showError('❌ Failed to update slide status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      buttonText: '',
      buttonLink: '',
      isActive: true,
      order: 0,
    });
    setEditingSlide(null);
    setShowForm(false);
  };

  const startEdit = (slide: any) => {
    setFormData({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      imageUrl: slide.imageUrl || '',
      buttonText: slide.buttonText || '',
      buttonLink: slide.buttonLink || '',
      isActive: slide.isActive ?? true,
      order: slide.order || 0,
    });
    setEditingSlide(slide);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stats = {
    total: slides.length,
    active: slides.filter(s => s.isActive).length,
    inactive: slides.filter(s => !s.isActive).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading hero slides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">Delete Slide?</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>{confirmModal.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', title: '' })}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Hero Slides
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Sparkles size={16} />
            Manage homepage slideshow banners
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
        >
          {showForm ? <Trash2 size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancel' : 'Add Slide'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-1">Total Slides</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
          <p className="text-sm font-semibold text-green-700 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">Inactive</p>
          <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {editingSlide ? (
              <>
                <Edit size={24} className="text-pink-600" />
                Edit Slide: {editingSlide.title}
              </>
            ) : (
              <>
                <Plus size={24} className="text-pink-600" />
                Add New Slide
              </>
            )}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData({...formData, imageUrl: url as string})}
              label="Hero Image (Recommended: 1920x1080px)"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Delicious Cakes for Every Occasion"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="Made with love, baked to perfection"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Button Text</label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                  placeholder="Shop Now"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Button Link</label>
                <input
                  type="text"
                  value={formData.buttonLink}
                  onChange={(e) => setFormData({...formData, buttonLink: e.target.value})}
                  placeholder="/cakes"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm font-semibold text-gray-700">Active (Show on homepage)</span>
              </label>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                  min="0"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-105"
              >
                {editingSlide ? 'Update Slide' : 'Create Slide'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slides List */}
      {slides.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <ImageIcon className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No slides yet</p>
          <p className="text-gray-400 text-sm mt-2">Add your first hero slide to get started</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {slides.map((slide) => (
            <div key={slide.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1">
              <div className="flex flex-col lg:flex-row">
                <div className="relative h-64 lg:h-auto lg:w-2/5 bg-gray-200 flex-shrink-0">
                  {slide.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => toggleActive(slide.id, slide.isActive)}
                      className={`p-2.5 rounded-xl shadow-lg backdrop-blur-sm transition-all ${
                        slide.isActive 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-gray-500 text-white hover:bg-gray-600'
                      }`}
                      title={slide.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {slide.isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-bold">
                      Order: {slide.order}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <div className="flex justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-2xl text-gray-800 mb-2">{slide.title}</h3>
                      {slide.subtitle && (
                        <p className="text-gray-600 mb-3">{slide.subtitle}</p>
                      )}
                      {slide.buttonText && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm font-semibold">
                          <span>Button: {slide.buttonText}</span>
                          <span className="text-pink-400">→</span>
                          <span className="text-pink-600">{slide.buttonLink || '/'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => startEdit(slide)}
                        className="flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl hover:bg-blue-200 transition-all font-semibold transform hover:scale-105 border-2 border-blue-200"
                      >
                        <Edit size={18} />
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmModal({ show: true, id: slide.id, title: slide.title })}
                        className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2.5 rounded-xl hover:bg-red-200 transition-all font-semibold transform hover:scale-105 border-2 border-red-200"
                      >
                        <Trash2 size={18} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      slide.isActive 
                        ? 'bg-green-100 text-green-700 border-2 border-green-200' 
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                    }`}>
                      {slide.isActive ? '✓ ACTIVE' : '✗ INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
