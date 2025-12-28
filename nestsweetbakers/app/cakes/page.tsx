'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import OrderForm from '@/components/OrderForm';
import { useParams } from 'next/navigation';
import { Cake } from '@/lib/types';

export default function CakeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [cake, setCake] = useState<Cake | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCake = async () => {
      const docRef = doc(db, 'products', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCake({ id: docSnap.id, ...docSnap.data() } as Cake);
      }
      setLoading(false);
    };
    fetchCake();
  }, [slug]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!cake) return <div className="text-center py-8">Cake not found</div>;

  const imageUrl = cake.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Image
            src={imageUrl}
            alt={cake.name}
            width={600}
            height={400}
            className="rounded-xl shadow-lg"
          />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{cake.name}</h1>
          <p className="text-gray-600 mb-6">{cake.description}</p>
          <div className="mb-6">
            <span className="text-3xl font-bold text-pink-600">₹{cake.basePrice}</span>
          </div>
          <OrderForm cake={cake} />
        </div>
      </div>
    </div>
  );
}
