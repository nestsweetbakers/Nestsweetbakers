'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { Cake } from '@/lib/types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package, 
  DollarSign, 
  Tag,
  Image as ImageIcon,
  X,
  TrendingUp,
  Images
} from 'lucide-react';
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';

export default function AdminProducts() {
  const [products, setProducts] = useState<Cake[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Cake | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    id: string;
    name: string;
  }>({ show: false, id: '', name: '' });
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '' as string | number,
    category: '',
    imageUrl: '',
    images: [] as string[]
  });

  const fetchProducts = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const productsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cake));
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products
  useEffect(() => {
    let result = [...products];

    if (categoryFilter !== 'all') {
      result = result.filter(product => product.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.name?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search) ||
        product.category?.toLowerCase().includes(search)
      );
    }

    setFilteredProducts(result);
  }, [products, categoryFilter, searchTerm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const price = typeof formData.basePrice === 'string' ? parseFloat(formData.basePrice) : formData.basePrice;
    
    if (!formData.name || !formData.description || !price || price <= 0 || !formData.category || !formData.imageUrl) {
      showError('❌ Please fill all required fields correctly');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      basePrice: price,
      category: formData.category,
      imageUrl: formData.imageUrl,
      images: formData.images || [],
    };

    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: serverTimestamp()
        });
        setProducts(products.map(p => 
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));
        showSuccess('✅ Product updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          orderCount: 0,
          createdAt: serverTimestamp()
        });
        setProducts([{ id: docRef.id, ...productData, orderCount: 0 } as Cake, ...products]);
        showSuccess('✅ Product added successfully');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to save product');
    }
  }

  async function handleDelete() {
    try {
      await deleteDoc(doc(db, 'products', confirmModal.id));
      setProducts(products.filter(p => p.id !== confirmModal.id));
      showSuccess('✅ Product deleted successfully');
      setConfirmModal({ show: false, id: '', name: '' });
    } catch (error) {
      console.error('Error:', error);
      showError('❌ Failed to delete product');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      category: '',
      imageUrl: '',
      images: []
    });
    setEditingProduct(null);
    setShowForm(false);
  }

  function editProduct(product: Cake) {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      basePrice: product.basePrice || '',
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      images: product.images || []
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const categories = ['Birthday', 'Wedding', 'Anniversary', 'Custom', 'Special'];
  const stats = {
    total: products.length,
    birthday: products.filter(p => p.category === 'Birthday').length,
    wedding: products.filter(p => p.category === 'Wedding').length,
    custom: products.filter(p => p.category === 'Custom').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading products...</p>
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
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">Delete Product?</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>{confirmModal.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', name: '' })}
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
            Products Management
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Package size={16} />
            Manage your cake catalog and inventory
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
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-1">Total Products</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border-2 border-pink-200">
          <p className="text-sm font-semibold text-pink-700 mb-1">Birthday</p>
          <p className="text-3xl font-bold text-pink-600">{stats.birthday}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
          <p className="text-sm font-semibold text-purple-700 mb-1">Wedding</p>
          <p className="text-3xl font-bold text-purple-600">{stats.wedding}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-2 border-yellow-200">
          <p className="text-sm font-semibold text-yellow-700 mb-1">Custom</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.custom}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {editingProduct ? (
              <>
                <Edit size={24} className="text-pink-600" />
                Edit Product: {editingProduct.name}
              </>
            ) : (
              <>
                <Plus size={24} className="text-pink-600" />
                Add New Product
              </>
            )}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <ImageUpload
              value={[formData.imageUrl, ...formData.images].filter(Boolean)}
              onChange={(urls) => {
                const urlArray = Array.isArray(urls) ? urls : [urls];
                setFormData({
                  ...formData,
                  imageUrl: urlArray[0] || '',
                  images: urlArray.slice(1, 5)
                });
              }}
              multiple
              maxImages={5}
              label="Product Images (1 main + up to 4 additional) *"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Chocolate Truffle Cake"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Tag size={16} />
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                placeholder="Describe your delicious cake..."
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign size={16} />
                Base Price (₹) *
              </label>
              <input
                type="number"
                placeholder="500"
                required
                min="1"
                value={formData.basePrice}
                onChange={e => setFormData({...formData, basePrice: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-105"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-lg font-semibold">No products found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or add a new product</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <div className="relative h-48 w-full">
                <Image 
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'} 
                  alt={product.name} 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-800 border-2 border-white">
                    {product.category}
                  </span>
                </div>
                {product.images && product.images.length > 0 && (
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold flex items-center gap-1">
                      <Images size={12} />
                      +{product.images.length}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-5">
                <h3 className="font-bold text-xl text-gray-800 mb-2 line-clamp-1">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Base Price</p>
                    <p className="text-2xl font-bold text-pink-600">₹{product.basePrice}</p>
                  </div>
                  {product.orderCount !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Orders</p>
                      <p className="text-lg font-bold text-gray-800 flex items-center gap-1">
                        <TrendingUp size={16} className="text-green-500" />
                        {product.orderCount}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => editProduct(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold transform hover:scale-105 border-2 border-blue-200"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  {product.id && (
                    <button
                      onClick={() => setConfirmModal({ show: true, id: product.id!, name: product.name })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold transform hover:scale-105 border-2 border-red-200"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}
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
