import Link from 'next/link';
import Image from 'next/image';
import { Cake } from '@/lib/types';

interface CakeCardProps {
  cake: Cake;
}

export default function CakeCard({ cake }: CakeCardProps) {
  const imageUrl = cake.imageUrl && cake.imageUrl.trim() !== '' 
    ? cake.imageUrl 
    : 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600';

  return (
    <Link href={`/cakes/${cake.id}`} className="block">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        <div className="relative h-64">
          <Image
            src={imageUrl}
            alt={cake.name || 'Cake'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">{cake.name}</h3>
          <p className="text-gray-600 mb-4 line-clamp-2">{cake.description || 'Delicious cake'}</p>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-pink-600">
              ₹{cake.basePrice}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {cake.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
