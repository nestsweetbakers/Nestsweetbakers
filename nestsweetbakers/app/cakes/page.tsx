'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CakeCard from '@/components/CakeCard';
import { Cake } from '@/lib/types';
import { useSettings } from '@/hooks/useSettings';
import { 
  Search, X, SlidersHorizontal, Grid, List, Loader2, TrendingUp, 
  Sparkles, ChevronDown, Star, Package, Award, Flame, Filter,
  ArrowUpDown, Zap, Heart, ShoppingBag, Eye, BadgePercent, Phone,
  Mail, MapPin, Clock, MessageCircle, Facebook, Instagram, Twitter
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = ['All', 'Birthday', 'Wedding', 'Anniversary', 'Custom', 'Special', 'Eggless', 'Vegan'];
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 - ₹1000', min: 500, max: 1000 },
  { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
  { label: 'Above ₹2000', min: 2000, max: Infinity },
];
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most Popular', icon: TrendingUp },
  { value: 'price-low', label: 'Price: Low to High', icon: ArrowUpDown },
  { value: 'price-high', label: 'Price: High to Low', icon: ArrowUpDown },
  { value: 'name', label: 'Name: A-Z', icon: Filter },
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'newest', label: 'Newest First', icon: Sparkles },
];

interface ExtendedCake extends Omit<Cake, 'discount' | 'stock'> {
  discount?: number;
  stock?: number;
  featured?: boolean;
  tags?: string[];
  orderCount?: number;
}

export default function CakesPage() {
  const [cakes, setCakes] = useState<ExtendedCake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [animateCards, setAnimateCards] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const searchParams = useSearchParams();

  // Get currency symbol based on settings (safe access)
  const currencySymbol = settings?.currency === 'CAD' ? '$' : '₹';

  // Initialize search from URL: /cakes?search=vanila
  useEffect(() => {
    const initialSearch = searchParams.get('search');
    if (initialSearch && !searchQuery) {
      setSearchQuery(initialSearch);
    }
  }, [searchParams, searchQuery]);

  useEffect(() => {
    async function fetchCakes() {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const cakesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as ExtendedCake));
        
        setCakes(cakesData);
        setTimeout(() => setAnimateCards(true), 100);
      } catch (error) {
        console.error('Error fetching cakes:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCakes();
  }, []);

  // Advanced filtering and sorting
  const filteredCakes = useMemo(() => {
    let result = [...cakes];

    if (selectedCategory !== 'All') {
      result = result.filter(cake => cake.category === selectedCategory);
    }

    // Price range filter (uses discounted price if discount exists)
    result = result.filter(cake => {
      const price = cake.discount && cake.discount > 0 
        ? cake.basePrice * (1 - cake.discount / 100)
        : cake.basePrice;
      return price >= priceRange.min && price <= priceRange.max;
    });

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cake =>
        (cake.name?.toLowerCase() || '').includes(query) ||
        (cake.description?.toLowerCase() || '').includes(query) ||
        (cake.category?.toLowerCase() || '').includes(query) ||
        (cake.tags?.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Sorting
    switch (sortBy) {
      case 'popularity':
        result.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        break;
      case 'price-low':
        result.sort((a, b) => {
          const priceA = a.discount ? a.basePrice * (1 - a.discount / 100) : a.basePrice;
          const priceB = b.discount ? b.basePrice * (1 - b.discount / 100) : b.basePrice;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        result.sort((a, b) => {
          const priceA = a.discount ? a.basePrice * (1 - a.discount / 100) : a.basePrice;
          const priceB = b.discount ? b.basePrice * (1 - b.discount / 100) : b.basePrice;
          return priceB - priceA;
        });
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [cakes, selectedCategory, searchQuery, sortBy, priceRange]);

  const featuredCakes = useMemo(() => {
    return cakes.filter(cake => cake.featured).slice(0, 3);
  }, [cakes]);

  const bestSellers = useMemo(() => {
    return [...cakes]
      .filter(cake => (cake.orderCount || 0) > 10)
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
      .slice(0, 3);
  }, [cakes]);

  const stats = useMemo(() => {
    return {
      total: cakes.length,
      featured: cakes.filter(c => c.featured).length,
      onSale: cakes.filter(c => (c.discount || 0) > 0).length,
      popular: cakes.filter(c => (c.orderCount || 0) > 10).length
    };
  }, [cakes]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceRange(PRICE_RANGES[0]);
    setSortBy('popularity');
  };

  const hasActiveFilters = 
    selectedCategory !== 'All' ||
    priceRange !== PRICE_RANGES[0] ||
    searchQuery.trim() !== '';

  const activeFiltersCount = [
    selectedCategory !== 'All',
    priceRange !== PRICE_RANGES[0],
    searchQuery.trim() !== ''
  ].filter(Boolean).length;

  // Main list: when filters/search are active, show filtered cakes first,
  // then extra featured cakes (not already in filtered list)
  const mainCakes = useMemo(() => {
    if (!hasActiveFilters) {
      return filteredCakes;
    }
    const filteredIds = new Set(filteredCakes.map(c => c.id));
    const extraFeatured = cakes.filter(
      c => c.featured && !filteredIds.has(c.id)
    );
    return [...filteredCakes, ...extraFeatured];
  }, [hasActiveFilters, filteredCakes, cakes]);

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-pink-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg animate-pulse">
            Loading delicious cakes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-4 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Contact Modal */}
        {showContactModal && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowContactModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  Contact Us
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Phone */}
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition group"
                >
                  <div className="p-3 bg-green-500 rounded-full">
                    <Phone className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">
                      Call Us
                    </p>
                    <p className="text-base font-bold text-gray-800 group-hover:text-green-600 transition">
                      {settings.phone}
                    </p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition group"
                >
                  <div className="p-3 bg-green-600 rounded-full">
                    <MessageCircle className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">
                      WhatsApp
                    </p>
                    <p className="text-base font-bold text-gray-800 group-hover:text-green-600 transition">
                      {settings.whatsapp}
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition group"
                >
                  <div className="p-3 bg-blue-500 rounded-full">
                    <Mail className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">
                      Email
                    </p>
                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition break-all">
                      {settings.email}
                    </p>
                  </div>
                </a>

                {/* Address */}
                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">
                      Location
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {settings.address}
                    </p>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl">
                  <div className="p-3 bg-orange-500 rounded-full">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">
                      Business Hours
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {settings.businessHours}
                    </p>
                  </div>
                </div>

                {/* Social Media */}
                {(settings.socialMedia.facebook ||
                  settings.socialMedia.instagram ||
                  settings.socialMedia.twitter) && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-600 font-medium mb-3">
                      Follow Us
                    </p>
                    <div className="flex gap-3">
                      {settings.socialMedia.facebook && (
                        <a
                          href={settings.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-blue-100 rounded-full hover:bg-blue-200 transition"
                        >
                          <Facebook className="text-blue-600" size={20} />
                        </a>
                      )}
                      {settings.socialMedia.instagram && (
                        <a
                          href={settings.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-pink-100 rounded-full hover:bg-pink-200 transition"
                        >
                          <Instagram className="text-pink-600" size={20} />
                        </a>
                      )}
                      {settings.socialMedia.twitter && (
                        <a
                          href={settings.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-blue-100 rounded-full hover:bg-blue-200 transition"
                        >
                          <Twitter className="text-blue-500" size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Contact Button */}
        <button
          onClick={() => setShowContactModal(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 z-40 animate-bounce"
          title="Contact Us"
        >
          <Phone size={24} />
        </button>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="text-center mb-6 md:mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              {settings.businessName} Collection
            </h1>
            <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
              {settings.deliveryInfo} 🎂
            </p>
            
            {/* Quick Contact Info Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 text-sm">
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition"
              >
                <Phone size={16} />
                <span className="font-medium">{settings.phone}</span>
              </a>
              <span className="text-gray-300">|</span>
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition"
              >
                <Mail size={16} />
                <span className="font-medium hidden sm:inline">
                  {settings.email}
                </span>
                <span className="font-medium sm:hidden">Email Us</span>
              </a>
              <span className="text-gray-300 hidden md:inline">|</span>
              <div className="flex items-center gap-2 text-gray-600 hidden md:flex">
                <Clock size={16} />
                <span className="font-medium">
                  {settings.businessHours}
                </span>
              </div>
            </div>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-6 max-w-5xl mx-auto">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <Package className="text-blue-600 mx-auto mb-2" size={28} />
                <p className="text-2xl md:text-3xl font-bold text-blue-600">
                  {stats.total}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
                  Total Cakes
                </p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border-2 border-yellow-200 hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <Star className="text-yellow-600 mx-auto mb-2 fill-current" size={28} />
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">
                  {stats.featured}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
                  Featured
                </p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border-2 border-red-200 hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <BadgePercent className="text-red-600 mx-auto mb-2" size={28} />
                <p className="text-2xl md:text-3xl font-bold text-red-600">
                  {stats.onSale}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
                  On Sale
                </p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <Flame className="text-purple-600 mx-auto mb-2" size={28} />
                <p className="text-2xl md:text-3xl font-bold text-purple-600">
                  {stats.popular}
                </p>
                <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
                  Popular
                </p>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div
            className="max-w-3xl mx-auto mb-4 md:mb-6 animate-fade-in"
            style={{ animationDelay: '100ms' }}
          >
            <div className="relative">
              <Search
                className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name, flavor, occasion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-3 md:py-4 border-2 border-gray-200 rounded-full focus:border-pink-500 focus:outline-none text-sm md:text-base shadow-lg transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div
            className="bg-white rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 mb-4 md:mb-6 animate-fade-in"
            style={{ animationDelay: '200ms' }}
          >
            {/* Mobile Filter Bar */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 bg-pink-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-pink-700 transition whitespace-nowrap flex-shrink-0"
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-pink-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setShowMobileSort(!showMobileSort)}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0"
                >
                  <ArrowUpDown size={14} />
                  Sort
                </button>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition ${
                      viewMode === 'grid'
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition ${
                      viewMode === 'list'
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                {filteredCakes.length} found
              </p>
            </div>

            {/* Mobile Sort Modal */}
            {showMobileSort && (
              <div
                className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end animate-fade-in"
                onClick={() => setShowMobileSort(false)}
              >
                <div
                  className="bg-white w-full rounded-t-3xl p-6 animate-slide-up"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Sort By</h3>
                    <button
                      onClick={() => setShowMobileSort(false)}
                      className="p-2"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {SORT_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowMobileSort(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                            sortBy === option.value
                              ? 'bg-pink-100 text-pink-600 border-2 border-pink-300'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="font-medium flex-1 text-left">
                            {option.label}
                          </span>
                          {sortBy === option.value && (
                            <Zap size={16} className="text-pink-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Stats & View Toggle */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-gray-600">
                  Showing{' '}
                  <span className="text-pink-600 font-bold">
                    {filteredCakes.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold">
                    {cakes.length}
                  </span>{' '}
                  cakes
                </p>
                {activeFiltersCount > 0 && (
                  <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold">
                    {activeFiltersCount} filter
                    {activeFiltersCount > 1 ? 's' : ''} active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                  }`}
                  title="Grid View"
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                  }`}
                  title="List View"
                >
                  <List size={20} />
                </button>
              </div>
            </div>

            {/* Filters Content */}
            <div
              className={`${
                showFilters ? 'block' : 'hidden md:block'
              } space-y-4 pt-4 md:pt-0 border-t md:border-0 mt-4 md:mt-0`}
            >
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2 md:mb-3">
                  Category
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-all text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                    Price Range
                  </label>
                  <select
                    value={PRICE_RANGES.indexOf(priceRange)}
                    onChange={(e) =>
                      setPriceRange(
                        PRICE_RANGES[parseInt(e.target.value, 10)]
                      )
                    }
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none text-xs md:text-sm bg-white"
                  >
                    {PRICE_RANGES.map((range, index) => (
                      <option key={index} value={index}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none text-xs md:text-sm bg-white"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleClearFilters}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-xs md:text-sm flex items-center justify-center gap-2"
                  >
                    <X size={14} />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Cakes Section (only when NO active filters/search) */}
        {!hasActiveFilters && featuredCakes.length > 0 && (
          <div
            className="mb-8 md:mb-12 animate-fade-in"
            style={{ animationDelay: '300ms' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Star className="text-yellow-600 fill-current" size={24} />
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                  Featured Cakes
                </h2>
              </div>
              <span className="text-sm text-gray-500 font-medium">
                {featuredCakes.length} items
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {featuredCakes.map((cake, index) => (
                <div 
                  key={cake.id}
                  className="animate-fade-in hover:scale-105 transition-transform duration-300"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <CakeCard cake={cake as Cake} showBadge index={index} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Sellers Section (only when NO active filters/search) */}
        {!hasActiveFilters && bestSellers.length > 0 && (
          <div
            className="mb-8 md:mb-12 animate-fade-in"
            style={{ animationDelay: '500ms' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <TrendingUp className="text-pink-600" size={24} />
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                  Best Sellers
                </h2>
              </div>
              <Link
                href="/cakes?sort=popularity"
                className="text-pink-600 font-semibold text-sm md:text-base hover:text-pink-700 transition flex items-center gap-1"
              >
                View All
                <ChevronDown className="rotate-[-90deg]" size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {bestSellers.map((cake, index) => (
                <div 
                  key={cake.id}
                  className="animate-fade-in hover:scale-105 transition-transform duration-300"
                  style={{ animationDelay: `${600 + index * 100}ms` }}
                >
                  <CakeCard cake={cake as Cake} showBadge index={index} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Cakes Grid */}
        {filteredCakes.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                {searchQuery ? (
                  <div className="mb-2">
                    <p className="text-sm md:text-base text-gray-700">
                      Search results for{' '}
                      <span className="font-bold text-pink-600">
                        &quot;{searchQuery}&quot;
                      </span>
                    </p>
                  </div>
                ) : (
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                    {selectedCategory === 'All'
                      ? 'All Cakes'
                      : `${selectedCategory} Cakes`}
                  </h2>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {filteredCakes.length}{' '}
                  {filteredCakes.length === 1 ? 'cake' : 'cakes'} available
                </p>
              </div>
            </div>
            
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8'
                  : 'space-y-6'
              }
            >
              {mainCakes.map((cake, index) => (
                <div
                  key={cake.id}
                  className={`${
                    animateCards ? 'animate-fade-in' : 'opacity-0'
                  } ${
                    viewMode === 'grid'
                      ? 'hover:scale-105 transition-transform duration-300'
                      : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CakeCard
                    cake={cake as Cake}
                    variant="default"
                    index={index}
                  />
                </div>
              ))}
            </div>

            {filteredCakes.length >= 9 && (
              <div className="text-center mt-12 animate-fade-in">
                <p className="text-gray-500 mb-4">
                  Showing all {filteredCakes.length} cakes
                </p>
                <button className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-bold shadow-lg transform hover:scale-105 flex items-center gap-2 mx-auto">
                  <Eye size={20} />
                  Explore More Categories
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg animate-fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No cakes found
            </h3>
            <p className="text-gray-500 text-lg mb-6 px-4">
              {searchQuery
                ? `No cakes matching "${searchQuery}"`
                : 'Try adjusting your filters to see more results'}
            </p>
            <button
              onClick={handleClearFilters}
              className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-full hover:from-pink-700 hover:to-purple-700 transition font-semibold shadow-lg transform hover:scale-105"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Call to Action with Dynamic Contact */}
        <div className="mt-16 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl animate-fade-in">
          <Sparkles className="mx-auto mb-4 animate-bounce" size={40} />
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Can&apos;t Find What You&lsquo;re Looking For?
          </h2>
          <p className="text-pink-100 mb-8 text-lg max-w-2xl mx-auto">
            Create your dream cake with our custom cake designer. Choose your
            flavors, design, and message!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/custom-cakes"
              className="inline-flex items-center justify-center gap-2 bg-white text-pink-600 px-8 py-4 rounded-full font-bold hover:bg-pink-50 transition-all transform hover:scale-105 shadow-lg"
            >
              <Sparkles size={20} />
              Design Custom Cake
            </Link>
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white border-2 border-white px-8 py-4 rounded-full font-bold hover:bg-white/30 transition-all"
            >
              <Phone size={20} />
              Call {settings.phone}
            </a>
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-4 rounded-full font-bold hover:bg-green-600 transition-all shadow-lg"
            >
              <MessageCircle size={20} />
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 1024px) {
          .container {
            max-width: 1280px;
          }
        }
      `}</style>
    </div>
  );
}
