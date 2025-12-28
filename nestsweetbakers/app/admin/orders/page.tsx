'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: new Date().toISOString() 
      });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update order');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <div className="p-8">Loading orders...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Orders Management</h1>
      
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cake</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 text-sm">{order.id?.slice(0, 8) || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium">{order.customerName}</div>
                  <div className="text-sm text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="px-6 py-4 text-sm">{order.cakeName}</td>
                <td className="px-6 py-4 text-sm font-medium">₹{order.totalPrice}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {order.id && (
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id!, e.target.value)}
                      disabled={updating === order.id}
                      className="border rounded px-2 py-1 disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No orders yet
          </div>
        )}
      </div>
    </div>
  );
}
