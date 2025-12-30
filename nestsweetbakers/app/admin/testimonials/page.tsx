'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import Image from 'next/image';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    content: '',
    rating: 5,
    imageUrl: '',
    approved: false,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const testimonialsSnap = await getDocs(collection(db, 'testimonials'));
      const testimonialsData = testimonialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTestimonials(testimonialsData);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTestimonial) {
        await updateDoc(doc(db, 'testimonials', editingTestimonial.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        alert('Testimonial updated successfully');
      } else {
        await addDoc(collection(db, 'testimonials'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        alert('Testimonial created successfully');
      }
      
      resetForm();
      fetchTestimonials();
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Failed to save testimonial');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      await deleteDoc(doc(db, 'testimonials', id));
      setTestimonials(testimonials.filter(t => t.id !== id));
      alert('Testimonial deleted successfully');
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      alert('Failed to delete testimonial');
    }
  };

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'testimonials', id), {
        approved: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      fetchTestimonials();
    } catch (error) {
      console.error('Error toggling approval:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      content: '',
      rating: 5,
      imageUrl: '',
      approved: false,
    });
    setEditingTestimonial(null);
    setShowForm(false);
  };

  const startEdit = (testimonial: any) => {
    setFormData(testimonial);
    setEditingTestimonial(testimonial);
    setShowForm(true);
  };

  const filteredTestimonials = testimonials.filter(testimonial =>
    testimonial.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    testimonial.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Testimonials</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage customer testimonials</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold text-sm sm:text-base"
        >
          <Plus size={20} />
          {showForm ? 'Cancel' : 'Add Testimonial'}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search testimonials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
            {editingTestimonial ? 'Edit Testimonial' : 'New Testimonial'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role/Title</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  placeholder="Customer, Baker, etc."
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                required
                rows={4}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm sm:text-base"
                >
                  {[5, 4, 3, 2, 1].map(num => (
                    <option key={num} value={num}>{'⭐'.repeat(num)} ({num} Stars)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="approved"
                checked={formData.approved}
                onChange={(e) => setFormData({...formData, approved: e.target.checked})}
                className="rounded text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="approved" className="text-sm font-medium text-gray-700">
                Approved for display
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all font-semibold text-sm sm:text-base"
              >
                {editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'}
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

      {/* Testimonials List */}
      {filteredTestimonials.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
          <p className="text-gray-500 text-sm sm:text-lg">No testimonials yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all">
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0 overflow-hidden">
                  {testimonial.imageUrl ? (
                    <Image
                      src={testimonial.imageUrl}
                      alt={testimonial.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    testimonial.name?.charAt(0) || 'T'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">{testimonial.name}</h3>
                  {testimonial.role && (
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{testimonial.role}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {'⭐'.repeat(testimonial.rating || 5)}
                  </div>
                </div>
                <button
                  onClick={() => toggleApproval(testimonial.id, testimonial.approved)}
                  className={`p-2 rounded-lg transition-colors ${
                    testimonial.approved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={testimonial.approved ? 'Approved' : 'Not Approved'}
                >
                  {testimonial.approved ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </button>
              </div>

              <p className="text-gray-700 text-sm sm:text-base mb-4 line-clamp-4">{testimonial.content}</p>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <button
                  onClick={() => startEdit(testimonial)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(testimonial.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
