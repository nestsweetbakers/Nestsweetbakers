'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function HeroSlidesPage() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const slidesSnap = await getDocs(collection(db, 'heroSlides'));
      const slidesData = slidesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => a.order - b.order);
      setSlides(slidesData);
    } catch (error) {
      console.error('Error fetching slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSlide) {
        await updateDoc(doc(db, 'heroSlides', editingSlide.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        alert('Slide updated successfully');
      } else {
        await addDoc(collection(db, 'heroSlides'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        alert('Slide created successfully');
      }
      
      resetForm();
      fetchSlides();
    } catch (error) {
      console.error('Error saving slide:', error);
      alert('Failed to save slide');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      await deleteDoc(doc(db, 'heroSlides', id));
      setSlides(slides.filter(s => s.id !== id));
      alert('Slide deleted successfully');
    } catch (error) {
      console.error('Error deleting slide:', error);
      alert('Failed to delete slide');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'heroSlides', id), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      fetchSlides();
    } catch (error) {
      console.error('Error toggling slide status:', error);
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
    setFormData(slide);
    setEditingSlide(slide);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Hero Slides</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage homepage slideshow</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold text-sm sm:text-base"
        >
          <Plus size={20} />
          {showForm ? 'Cancel' : 'Add Slide'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
            {editingSlide ? 'Edit Slide' : 'New Slide'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                required
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                  placeholder="Shop Now"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Button Link</label>
                <input
                  type="text"
                  value={formData.buttonLink}
                  onChange={(e) => setFormData({...formData, buttonLink: e.target.value})}
                  placeholder="/cakes"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                  min="0"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all font-semibold text-sm sm:text-base"
              >
                {editingSlide ? 'Update Slide' : 'Create Slide'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg hover:bg-gray-300 transition-all font-semibold text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slides List */}
      {slides.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
          <p className="text-gray-500 text-sm sm:text-lg">No slides yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {slides.map((slide) => (
            <div key={slide.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
              <div className="flex flex-col lg:flex-row">
                <div className="relative h-48 sm:h-64 lg:h-auto lg:w-1/3 bg-gray-200 flex-shrink-0">
                  {slide.imageUrl && (
                    <Image
                      src={slide.imageUrl}
                      alt={slide.title}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => toggleActive(slide.id, slide.isActive)}
                      className={`p-2 rounded-lg shadow-lg ${
                        slide.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}
                    >
                      {slide.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-2 break-words">{slide.title}</h3>
                      <p className="text-gray-600 text-sm sm:text-base mb-2 break-words">{slide.subtitle}</p>
                      {slide.buttonText && (
                        <p className="text-sm text-gray-500">
                          Button: <span className="font-medium">{slide.buttonText}</span> → {slide.buttonLink}
                        </p>
                      )}
                    </div>
                    <div className="flex sm:flex-col gap-2 self-start">
                      <button
                        onClick={() => startEdit(slide)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        <Edit size={16} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(slide.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-3 py-1 rounded-full font-medium ${
                      slide.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {slide.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      Order: {slide.order}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
