'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cake } from '@/lib/types';

export default function AdminProducts() {
  const [products, setProducts] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Cake | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    category: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cake)));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.description || formData.basePrice <= 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (editingProduct && editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        setProducts(products.map(p => 
          p.id === editingProduct.id ? { ...p, ...formData } : p
        ));
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...formData,
          orderCount: 0,
          createdAt: new Date().toISOString()
        });
        setProducts([...products, { id: docRef.id, ...formData } as Cake]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save product');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete product');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      category: '',
      imageUrl: ''
    });
    setEditingProduct(null);
  }

  function editProduct(product: Cake) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
      imageUrl: product.imageUrl
    });
  }

  if (loading) return <div className="p-8">Loading products...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Products Management</h1>
      
      {/* Add/Edit Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingProduct ? 'Edit' : 'Add'} Product
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name *"
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
          
          <textarea
            placeholder="Description *"
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Price *"
              required
              min="1"
              value={formData.basePrice || ''}
              onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})}
              className="border rounded px-3 py-2"
            />
            
            <select
              required
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="">Select Category *</option>
              <option value="Birthday">Birthday</option>
              <option value="Wedding">Wedding</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          
          <input
            type="url"
            placeholder="Image URL *"
            required
            value={formData.imageUrl}
            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
            >
              {editingProduct ? 'Update' : 'Add'} Product
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      
      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
            <img 
              src={product.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'} 
              alt={product.name} 
              className="w-full h-48 object-cover" 
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
              <p className="text-pink-600 font-bold mt-2">₹{product.basePrice}</p>
              <p className="text-sm text-gray-500 mt-1">{product.category}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => editProduct(product)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                {product.id && (
                  <button
                    onClick={() => handleDelete(product.id!)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products yet. Add your first product above!
        </div>
      )}
    </div>
  );
}
