'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Cake } from '@/lib/types';

interface Props {
  cake: Cake;
}

export default function CakeCard({ cake }: Props) {
  // Use placeholder if imageUrl is empty
  const imageUrl = cake.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500';
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative h-48">
        <Image
          src={imageUrl}
          alt={cake.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{cake.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{cake.description}</p>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-pink-600">₹{cake.basePrice}</span>
          <Link
            href={`/cakes/${cake.id}`}
            className="bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-pink-700 transition"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
