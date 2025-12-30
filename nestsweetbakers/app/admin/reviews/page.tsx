'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { Star, Check, X, Trash2, Plus, Search, Filter, MessageSquare, TrendingUp } from 'lucide-react';

interface Review {
  id?: string;
  cakeId: string;
  cakeName?: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: any;
  approved: boolean;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    id: string;
    action: 'delete' | 'toggle';
    name: string;
    currentStatus?: boolean;
  }>({ show: false, id: '', action: 'delete', name: '' });
  const [newReview, setNewReview] = useState({
    cakeId: '',
    customerName: '',
    rating: 5,
    comment: '',
  });
  const [cakes, setCakes] = useState<Array<{id: string; name: string}>>([]);
  const { showSuccess, showError } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [reviewsSnap, cakesSnap] = await Promise.all([
        getDocs(collection(db, 'reviews')),
        getDocs(collection(db, 'products')),
      ]);

      const cakesData = cakesSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setCakes(cakesData);

      const reviewsData = reviewsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));

      const reviewsWithNames = reviewsData.map(review => ({
        ...review,
        cakeName: cakesData.find(c => c.id === review.cakeId)?.name || 'Unknown Cake'
      }));

      setReviews(reviewsWithNames.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return timeB.getTime() - timeA.getTime();
      }));
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleApproval() {
    const { id, currentStatus } = confirmModal;
    try {
      await updateDoc(doc(db, 'reviews', id), {
        approved: !currentStatus
      });
      setReviews(reviews.map(r => 
        r.id === id ? { ...r, approved: !currentStatus } : r
      ));
      showSuccess(`✅ Review ${!currentStatus ? 'approved' : 'unapproved'} successfully`);
      setConfirmModal({ show: false, id: '', action: 'toggle', name: '' });
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to update review');
    }
  }

  async function deleteReview() {
    try {
      await deleteDoc(doc(db, 'reviews', confirmModal.id));
      setReviews(reviews.filter(r => r.id !== confirmModal.id));
      showSuccess('✅ Review deleted successfully');
      setConfirmModal({ show: false, id: '', action: 'delete', name: '' });
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to delete review');
    }
  }

  async function addReview(e: React.FormEvent) {
    e.preventDefault();

    try {
      const docRef = await addDoc(collection(db, 'reviews'), {
        ...newReview,
        createdAt: serverTimestamp(),
        approved: true,
      });

      const cakeName = cakes.find(c => c.id === newReview.cakeId)?.name || 'Unknown';
      
      setReviews([{
        id: docRef.id,
        ...newReview,
        cakeName,
        createdAt: new Date(),
        approved: true,
      }, ...reviews]);

      setNewReview({ cakeId: '', customerName: '', rating: 5, comment: '' });
      setShowAddForm(false);
      showSuccess('✅ Review added successfully!');
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to add review');
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.cakeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'approved' && review.approved) ||
      (filterStatus === 'pending' && !review.approved);
    const matchesRating = filterRating === 0 || review.rating === filterRating;
    return matchesSearch && matchesStatus && matchesRating;
  });

  const stats = {
    total: reviews.length,
    approved: reviews.filter(r => r.approved).length,
    pending: reviews.filter(r => !r.approved).length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className={`w-16 h-16 ${
              confirmModal.action === 'delete' ? 'bg-red-100' : 
              confirmModal.currentStatus ? 'bg-yellow-100' : 'bg-green-100'
            } rounded-full flex items-center justify-center mx-auto mb-4`}>
              {confirmModal.action === 'delete' ? (
                <Trash2 className="text-red-600" size={32} />
              ) : confirmModal.currentStatus ? (
                <X className="text-yellow-600" size={32} />
              ) : (
                <Check className="text-green-600" size={32} />
              )}
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {confirmModal.action === 'delete' ? 'Delete Review?' :
               confirmModal.currentStatus ? 'Unapprove Review?' : 'Approve Review?'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {confirmModal.action === 'delete' 
                ? `Are you sure you want to delete the review from ${confirmModal.name}? This action cannot be undone.`
                : confirmModal.currentStatus
                ? `Remove approval from ${confirmModal.name}'s review?`
                : `Approve ${confirmModal.name}'s review?`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', action: 'delete', name: '' })}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.action === 'delete' ? deleteReview : toggleApproval}
                className={`flex-1 px-4 py-3 ${
                  confirmModal.action === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  confirmModal.currentStatus ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-green-600 hover:bg-green-700'
                } text-white rounded-xl font-semibold transition-all`}
              >
                {confirmModal.action === 'delete' ? 'Delete' :
                 confirmModal.currentStatus ? 'Unapprove' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Reviews Management
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <MessageSquare size={16} />
            Manage customer reviews and ratings
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Cancel' : 'Add Review'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-1">Total Reviews</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
          <p className="text-sm font-semibold text-green-700 mb-1">Approved</p>
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200">
          <p className="text-sm font-semibold text-yellow-700 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
          <p className="text-sm font-semibold text-purple-700 mb-1">Avg Rating</p>
          <p className="text-3xl font-bold text-purple-600 flex items-center gap-1">
            {stats.avgRating}
            <Star size={24} className="fill-yellow-400 text-yellow-400" />
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
          </div>
          <div className="md:col-span-1 flex items-center justify-center">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterRating(0);
              }}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              title="Clear filters"
            >
              <Filter size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Review Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Plus size={24} className="text-pink-600" />
            Add New Review
          </h2>
          <form onSubmit={addReview} className="space-y-4">
            <select
              required
              value={newReview.cakeId}
              onChange={e => setNewReview({...newReview, cakeId: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all"
            >
              <option value="">Select Cake</option>
              {cakes.map(cake => (
                <option key={cake.id} value={cake.id}>{cake.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Customer Name"
              required
              value={newReview.customerName}
              onChange={e => setNewReview({...newReview, customerName: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all"
            />

            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({...newReview, rating: star})}
                    className="transition-transform hover:scale-125"
                  >
                    <Star
                      size={40}
                      className={star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Review Comment"
              required
              value={newReview.comment}
              onChange={e => setNewReview({...newReview, comment: e.target.value})}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none transition-all"
            />

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-105"
              >
                Add Review
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews Grid */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <MessageSquare className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No reviews found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or add a new review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredReviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Decorative Element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{review.customerName}</h3>
                    <p className="text-sm text-gray-600">{review.cakeName}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    review.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {review.approved ? '✓ APPROVED' : '⏳ PENDING'}
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3 italic">
                  &quot;{review.comment}&quot;
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-4 border-t border-gray-100">
                  <span>
                    {new Date(review.createdAt?.toDate ? review.createdAt.toDate() : review.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={14} />
                    Review #{review.id?.slice(0, 6)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmModal({
                      show: true,
                      id: review.id!,
                      action: 'toggle',
                      name: review.customerName,
                      currentStatus: review.approved
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-semibold transform hover:scale-105 ${
                      review.approved
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-2 border-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-200'
                    }`}
                  >
                    {review.approved ? <X size={16} /> : <Check size={16} />}
                    <span>{review.approved ? 'Unapprove' : 'Approve'}</span>
                  </button>
                  <button
                    onClick={() => setConfirmModal({
                      show: true,
                      id: review.id!,
                      action: 'delete',
                      name: review.customerName
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold transform hover:scale-105 border-2 border-red-200"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
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
