'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CakeCard from '@/components/CakeCard';
import { Cake } from '@/lib/types';

const CATEGORIES = ['All', 'Birthday', 'Wedding', 'Anniversary', 'Custom'];

export default function CakesPage() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    async function fetchCakes() {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const cakesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Cake));
        
        setCakes(cakesData);
      } catch (error) {
        console.error('Error fetching cakes:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCakes();
  }, []);

  const filteredCakes = selectedCategory === 'All' 
    ? cakes 
    : cakes.filter(cake => cake.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading cakes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Our Cakes</h1>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Cakes Grid */}
      {filteredCakes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCakes.map((cake) => (
            <CakeCard key={cake.id} cake={cake} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {cakes.length === 0 
              ? 'No cakes available yet. Check back soon!' 
              : 'No cakes found in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
