// app/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as limitQuery,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Cake,
  HeroSlide as HeroSlideType,
  Feature,
  Testimonial as TestimonialType,
  Stats,
} from '@/lib/types';
import {
  ArrowRight,
  Star,
  Clock,
  Truck,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Heart,
  Shield,
  Users,
  Quote,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Package,
  Zap,
  ThumbsUp,
  Send,
  MessageCircle,
  CheckCircle,
  Gift,
  Cake as CakeIcon,
} from 'lucide-react';
import { useForm, ValidationError } from '@formspree/react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import Head from 'next/head';
import CakeCard from '@/components/CakeCard';

// Default data fallbacks
const DEFAULT_HERO_SLIDES: HeroSlideType[] = [
  {
    image:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1920&q=80',
    title: 'Welcome to NestSweets Bakery',
    subtitle: 'Crafting Sweet Memories, One Cake at a Time 🍰',
    ctaText: 'Order Now',
    ctaLink: '/cakes',
    order: 1,
    isActive: true,
  },
  {
    image:
      'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1920&q=80',
    title: 'Custom Birthday Cakes',
    subtitle: 'Make every birthday unforgettable with our special designs',
    ctaText: 'Explore Collection',
    ctaLink: '/cakes?category=Birthday',
    order: 2,
    isActive: true,
  },
  {
    image:
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80',
    title: 'Elegant Wedding Cakes',
    subtitle: 'Beautiful designs for your special day',
    ctaText: 'View Gallery',
    ctaLink: '/cakes?category=Wedding',
    order: 3,
    isActive: true,
  },
];

const DEFAULT_FEATURES: Feature[] = [
  {
    icon: 'star',
    title: 'Premium Quality',
    description: 'Finest ingredients sourced daily',
    order: 1,
  },
  {
    icon: 'clock',
    title: '24/7 Service',
    description: 'Order anytime, anywhere',
    order: 2,
  },
  {
    icon: 'truck',
    title: 'Fast Delivery',
    description: 'Same day delivery available',
    order: 3,
  },
  {
    icon: 'award',
    title: 'Award Winning',
    description: 'Best bakery in town',
    order: 4,
  },
  {
    icon: 'heart',
    title: 'Made with Love',
    description: 'Every cake is crafted with care',
    order: 5,
  },
  {
    icon: 'shield',
    title: 'Quality Assured',
    description: '100% satisfaction guarantee',
    order: 6,
  },
];

const DEFAULT_TESTIMONIALS: TestimonialType[] = [
  {
    name: 'Priya Sharma',
    rating: 5,
    comment:
      "Best chocolate cake I've ever had! Delivered on time and tasted amazing. The presentation was stunning!",
    image: 'https://i.pravatar.cc/150?img=1',
    date: '2 days ago',
    isApproved: true,
    order: 1,
  },
  {
    name: 'Rahul Kumar',
    rating: 5,
    comment:
      'Ordered a custom wedding cake. Exceeded all expectations! Highly recommended for special occasions.',
    image: 'https://i.pravatar.cc/150?img=2',
    date: '1 week ago',
    isApproved: true,
    order: 2,
  },
  {
    name: 'Anita Patel',
    rating: 5,
    comment:
      'Fresh, delicious, and beautifully designed. Will definitely order again! Amazing customer service.',
    image: 'https://i.pravatar.cc/150?img=3',
    date: '2 weeks ago',
    isApproved: true,
    order: 3,
  },
  {
    name: 'Vikram Singh',
    rating: 5,
    comment:
      'Amazing service and even more amazing taste! The birthday cake was a hit at the party!',
    image: 'https://i.pravatar.cc/150?img=4',
    date: '3 days ago',
    isApproved: true,
    order: 4,
  },
  {
    name: 'Neha Gupta',
    rating: 5,
    comment:
      'Absolutely loved the custom design. Professional, delicious, and on-time delivery!',
    image: 'https://i.pravatar.cc/150?img=5',
    date: '1 week ago',
    isApproved: true,
    order: 5,
  },
  {
    name: 'Amit Verma',
    rating: 5,
    comment:
      'The red velvet cake was divine! Perfect texture and taste. Highly satisfied with the service.',
    image: 'https://i.pravatar.cc/150?img=6',
    date: '4 days ago',
    isApproved: true,
    order: 6,
  },
];

const DEFAULT_STATS: Stats = {
  orders: 2500,
  customers: 1200,
  cakes: 50,
  rating: 4.9,
};

// Counter Animation Hook
function useCountUp(
  end: number,
  duration: number = 2000,
  isInView: boolean = false,
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isInView]);

  return count;
}

export default function HomePage() {
  const [popularCakes, setPopularCakes] = useState<Cake[]>([]);
  const [newCakes, setNewCakes] = useState<Cake[]>([]);
  const [heroSlides, setHeroSlides] =
    useState<HeroSlideType[]>(DEFAULT_HERO_SLIDES);
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES);
  const [testimonials, setTestimonials] =
    useState<TestimonialType[]>(DEFAULT_TESTIMONIALS);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsInView, setStatsInView] = useState(false);

  const newScrollRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Formspree integration
  const [state, handleSubmit] = useForm('meeojoaa');

  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  // Animated counters
  const ordersCount = useCountUp(stats.orders, 2000, statsInView);
  const customersCount = useCountUp(stats.customers, 2000, statsInView);
  const cakesCount = useCountUp(stats.cakes, 2000, statsInView);
  const ratingCount = useCountUp(stats.rating * 10, 2000, statsInView) / 10;

  // Show success message when form is submitted
  useEffect(() => {
    if (state.succeeded) {
      showSuccess("✅ Message sent successfully! We'll get back to you soon.");
    }
  }, [state.succeeded, showSuccess]);

  // Intersection Observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setStatsInView(true);
          }
        });
      },
      { threshold: 0.3 },
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-scroll testimonials
  useEffect(() => {
    if (testimonials.length === 0) return;

    const scrollTestimonials = () => {
      if (testimonialsRef.current) {
        const scrollWidth = testimonialsRef.current.scrollWidth;
        const clientWidth = testimonialsRef.current.clientWidth;
        const currentScroll = testimonialsRef.current.scrollLeft;

        if (currentScroll + clientWidth >= scrollWidth - 10) {
          testimonialsRef.current.scrollLeft = 0;
        } else {
          testimonialsRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    };

    const interval = setInterval(scrollTestimonials, 4000);
    return () => clearInterval(interval);
  }, [testimonials]);

  // Fetch all data from Firebase with fallbacks
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch Cakes (all products)
        try {
          const productsRef = collection(db, 'products');
          const allCakesSnap = await getDocs(productsRef);
          const cakesData = allCakesSnap.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as Cake),
          );

          if (cakesData.length > 0) {
            // Popular cakes (by order count)
            const sortedByPopularity = [...cakesData]
              .filter(c => c.isAvailable !== false)
              .sort(
                (a, b) => (b.orderCount || 0) - (a.orderCount || 0),
              );
            setPopularCakes(sortedByPopularity.slice(0, 8));

            // New cakes (by created date)
            const sortedByDate = [...cakesData]
              .filter(c => c.isAvailable !== false)
              .sort((a, b) => {
                const getTimestamp = (date: any): number => {
                  if (date instanceof Timestamp) return date.toMillis();
                  if (typeof date === 'string')
                    return new Date(date).getTime();
                  if (date && typeof date === 'object' && 'seconds' in date)
                    return date.seconds * 1000;
                  return 0;
                };
                return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
              });
            setNewCakes(sortedByDate.slice(0, 8));
          }
        } catch (error) {
          console.error('Error fetching cakes:', error);
        }

        // Fetch Hero Slides with fallback
        try {
          const heroQuery = query(
            collection(db, 'heroSlides'),
            where('isActive', '!=', false),
            orderBy('isActive', 'desc'),
            orderBy('order', 'asc'),
          );
          const heroSnap = await getDocs(heroQuery);
          if (!heroSnap.empty) {
            const fetchedSlides = heroSnap.docs.map(
              doc => ({ id: doc.id, ...doc.data() } as HeroSlideType),
            );
            setHeroSlides(fetchedSlides);
          }
        } catch (error) {
          console.error('Error fetching hero slides:', error);
        }

        // Fetch Features with fallback
        try {
          const featuresQuery = query(
            collection(db, 'features'),
            orderBy('order', 'asc'),
          );
          const featuresSnap = await getDocs(featuresQuery);
          if (!featuresSnap.empty) {
            const fetchedFeatures = featuresSnap.docs.map(
              doc => ({ id: doc.id, ...doc.data() } as Feature),
            );
            setFeatures(fetchedFeatures);
          }
        } catch (error) {
          console.error('Error fetching features:', error);
        }

        // Fetch Testimonials with fallback
        try {
          const testimonialsQuery = query(
            collection(db, 'testimonials'),
            where('isApproved', '==', true),
            orderBy('createdAt', 'desc'),
            limitQuery(12),
          );
          const testimonialsSnap = await getDocs(testimonialsQuery);
          if (!testimonialsSnap.empty) {
            const fetchedTestimonials = testimonialsSnap.docs.map(
              doc => ({ id: doc.id, ...doc.data() } as TestimonialType),
            );
            setTestimonials(fetchedTestimonials);
          }
        } catch (error) {
          console.error('Error fetching testimonials:', error);
        }

        // Fetch Stats with fallback
        try {
          const statsSnap = await getDocs(collection(db, 'stats'));
          if (!statsSnap.empty) {
            const fetchedStats = statsSnap.docs[0].data() as Stats;
            setStats(fetchedStats);
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showError(
          '⚠️ Some content could not be loaded. Showing default content.',
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [showError]);

  // Auto-slide hero
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides]);

  // Fixed scroll function with proper null check
  const scroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: 'left' | 'right',
  ) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      star: Star,
      clock: Clock,
      truck: Truck,
      award: Award,
      heart: Heart,
      shield: Shield,
      users: Users,
      package: Package,
      zap: Zap,
      thumbsup: ThumbsUp,
    };
    return icons[iconName.toLowerCase()] || Star;
  };

  const businessName = settings?.businessName || 'NestSweets Bakery';
  const businessPhone = settings?.phone || '+91 98765 43210';
  const businessEmail = settings?.email || 'hello@nestsweets.com';
  const businessAddress =
    settings?.address || 'Narnaund, Haryana, India';
  const whatsappNumber = settings?.whatsapp || businessPhone;

  return (
    <>
      <Head>
        <title>{businessName} - Premium Cakes | Order Online</title>
        <meta
          name="description"
          content={`Order delicious custom cakes online from ${businessName}. Premium quality birthday, wedding, and anniversary cakes with same-day delivery.`}
        />
        <meta
          name="keywords"
          content="cakes, custom cakes, birthday cakes, wedding cakes, bakery, online cake delivery"
        />
        <meta
          property="og:title"
          content={`${businessName} - Premium Cakes Delivered Fresh`}
        />
        <meta
          property="og:description"
          content="Order delicious custom cakes online with same-day delivery"
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://nestsweetbakers.com" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative h-[400px] md:h-[550px] overflow-hidden">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-all duration-1000 ${
                index === currentSlide
                  ? 'opacity-100 scale-100 z-10'
                  : 'opacity-0 scale-105 z-0'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/90 via-purple-600/90 to-pink-700/90 z-10" />
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
                quality={85}
              />
            </div>
          ))}

          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-center text-white px-4 max-w-4xl">
              <Sparkles
                className="inline-block text-yellow-300 mb-2 animate-pulse"
                size={32}
              />
              <h1 className="text-2xl md:text-5xl font-bold mb-3 animate-slide-up leading-tight">
                {heroSlides[currentSlide]?.title}
              </h1>
              <p className="text-sm md:text-xl mb-5 text-pink-100 font-light">
                {heroSlides[currentSlide]?.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={heroSlides[currentSlide]?.ctaLink || '/cakes'}
                  className="group bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-yellow-300 hover:text-gray-900 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
                >
                  {heroSlides[currentSlide]?.ctaText || 'Order Now'}
                  <ArrowRight
                    className="group-hover:translate-x-1 transition-transform"
                    size={16}
                  />
                </Link>
                <Link
                  href="/custom-cakes"
                  className="bg-transparent border-2 border-white px-6 py-3 rounded-full font-bold hover:bg-white hover:text-pink-600 transition-all shadow-2xl backdrop-blur-sm text-sm"
                >
                  Custom Cakes
                </Link>
              </div>
            </div>
          </div>

          {heroSlides.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentSlide(
                    prev => (prev - 1 + heroSlides.length) % heroSlides.length,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 z-40 bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/40 transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft className="text-white" size={20} />
              </button>
              <button
                onClick={() =>
                  setCurrentSlide(
                    prev => (prev + 1) % heroSlides.length,
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 z-40 bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/40 transition-all"
                aria-label="Next slide"
              >
                <ChevronRight className="text-white" size={20} />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-white w-6'
                        : 'bg-white/50 w-1.5'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Stats Section */}
        <section
          ref={statsRef}
          className="py-8 md:py-10 bg-gradient-to-r from-pink-600 to-purple-600 text-white"
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { count: ordersCount, label: 'Orders', suffix: '+', icon: Package },
                { count: customersCount, label: 'Customers', suffix: '+', icon: Users },
                { count: cakesCount, label: 'Varieties', suffix: '+', icon: TrendingUp },
                {
                  count: ratingCount.toFixed(1),
                  label: 'Rating',
                  suffix: '',
                  icon: Star,
                  showStar: true,
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="relative bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition-all transform hover:scale-105 duration-300"
                >
                  <div className="absolute top-2 right-2 opacity-20">
                    <stat.icon size={20} />
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-2xl md:text-3xl font-bold mb-1 flex items-center justify-center gap-1">
                      {stat.count}
                      {stat.suffix}
                      {stat.showStar && (
                        <Star
                          className="fill-yellow-300 text-yellow-300"
                          size={16}
                        />
                      )}
                    </div>
                    <div className="text-pink-100 text-xs font-semibold">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Cakes */}
        <section className="py-8 md:py-12 bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-pink-600" size={28} />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Popular Right Now
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Bestsellers everyone loves
                  </p>
                </div>
              </div>
              <Link
                href="/cakes"
                className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1 text-sm group"
              >
                View All
                <ArrowRight
                  className="group-hover:translate-x-1 transition-transform"
                  size={16}
                />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div
                    key={i}
                    className="h-80 bg-white rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : popularCakes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popularCakes.map((cake, index) => (
                  <CakeCard
                    key={cake.id}
                    cake={cake}
                    variant="compact"
                    index={index}
                    showBadge
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                <CakeIcon
                  size={64}
                  className="mx-auto mb-4 text-pink-300"
                />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  No Cakes Available Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  We&apos;re baking something amazing! Check back soon.
                </p>
                <Link
                  href="/custom-cakes"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-full font-bold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  <Gift size={18} />
                  Request Custom Cake
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* New Arrivals */}
        {newCakes.length > 0 && (
          <section className="py-8 md:py-12 bg-white">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-purple-600" size={28} />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">
                      New Arrivals
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Fresh designs just for you
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative group/scroll">
                <button
                  onClick={() => scroll(newScrollRef, 'left')}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-xl rounded-full p-3 hover:bg-purple-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => scroll(newScrollRef, 'right')}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-xl rounded-full p-3 hover:bg-purple-600 hover:text-white transition-all opacity-0 group-hover/scroll:opacity-100"
                >
                  <ChevronRight size={20} />
                </button>

                <div
                  ref={newScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth"
                >
                  {newCakes.map((cake, index) => (
                    <div
                      key={cake.id}
                      className="min-w-[240px] md:min-w-[280px] snap-start"
                    >
                      <CakeCard
                        cake={cake}
                        variant="compact"
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-8 md:py-12 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Why Choose {businessName}?
              </h2>
              <p className="text-gray-600 text-sm">
                Committed to delivering excellence
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {features.map((feature, i) => {
                const Icon = getIconComponent(feature.icon);
                return (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center group"
                  >
                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-pink-600 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-xs">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-8 md:py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Shop by Occasion
              </h2>
              <p className="text-gray-600 text-sm">
                Perfect cakes for every celebration
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                {
                  name: 'Birthday',
                  image: 'photo-1558636508-e0db3814bd1d',
                  gradient: 'from-pink-500/80 to-purple-600/80',
                  icon: '🎂',
                },
                {
                  name: 'Wedding',
                  image: 'photo-1519225421980-715cb0215aed',
                  gradient: 'from-purple-500/80 to-pink-600/80',
                  icon: '💍',
                },
                {
                  name: 'Anniversary',
                  image: 'photo-1586985289688-ca3cf47d3e6e',
                  gradient: 'from-red-500/80 to-pink-600/80',
                  icon: '❤️',
                },
                {
                  name: 'Custom',
                  image: 'photo-1576618148400-f54bed99fcfd',
                  gradient: 'from-yellow-500/80 to-orange-600/80',
                  icon: '✨',
                },
              ].map(cat => (
                <Link
                  key={cat.name}
                  href={`/cakes?category=${cat.name}`}
                  className="group relative h-40 md:h-52 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <Image
                    src={`https://images.unsplash.com/${cat.image}?w=400&q=80`}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} group-hover:opacity-90 transition-opacity`}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-125 transition-transform duration-300">
                      {cat.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
<section className="py-6 md:py-10 bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden">
  <div className="container mx-auto px-3 sm:px-4">
    <div className="text-center mb-6 md:mb-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 md:mb-2">
        Customer Reviews
      </h2>
      <p className="text-gray-600 text-xs sm:text-sm">
        What our customers say
      </p>
    </div>

    <div className="relative">
      <div
        ref={testimonialsRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 scroll-smooth hide-scrollbar"
      >
        {testimonials.map((testimonial, i) => (
          <div
            key={i}
            className="min-w-[220px] sm:min-w-[260px] md:min-w-[320px] bg-white p-4 sm:p-5 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-pink-100 flex-shrink-0"
          >
            <Quote className="text-pink-300 mb-2.5" size={20} />
            <div className="flex mb-2">
              {Array.from({ length: testimonial.rating }).map((_, j) => (
                <Star
                  key={j}
                  size={12}
                  className="fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <p className="text-gray-700 text-xs sm:text-sm mb-3 italic line-clamp-3">
              &ldquo;{testimonial.comment}&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              {testimonial.image && (
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="font-bold text-xs sm:text-sm text-gray-900">
                  {testimonial.name}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500">
                  {testimonial.date}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-r from-pink-50 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-purple-50 to-transparent pointer-events-none" />
    </div>
  </div>
</section>


        {/* Custom CTA */}
        <section className="py-8 md:py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-48 md:h-auto">
                  <Image
                    src="https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600&q=80"
                    alt="Custom Cake"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6 md:p-8 text-white flex flex-col justify-center">
                  <Sparkles className="mb-3" size={32} />
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    Dream It, We&apos;ll Create It
                  </h2>
                  <p className="text-sm md:text-base mb-5 text-pink-100">
                    Have a unique design? Our expert bakers will bring
                    your vision to life.
                  </p>
                  <Link
                    href="/custom-cakes"
                    className="inline-flex items-center justify-center gap-2 bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-yellow-300 hover:text-gray-900 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 w-fit text-sm"
                  >
                    Request Custom Cake
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form + Info */}
        <section className="py-8 md:py-12 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Form */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                    <Mail className="text-pink-600" size={28} />
                    Get in Touch
                  </h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Send us a message and we&apos;ll respond ASAP
                  </p>

                  {state.succeeded ? (
                    <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center animate-fade-in">
                      <CheckCircle
                        className="mx-auto mb-4 text-green-600"
                        size={48}
                      />
                      <h3 className="text-xl font-bold text-green-800 mb-2">
                        Message Sent!
                      </h3>
                      <p className="text-green-700 mb-4">
                        Thanks for contacting us! We&apos;ll get back to
                        you soon.
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="text-green-600 hover:text-green-700 font-semibold underline"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          name="name"
                          placeholder="Your Name *"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none text-sm"
                          required
                        />
                        <ValidationError
                          prefix="Name"
                          field="name"
                          errors={state.errors}
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <input
                          type="email"
                          name="email"
                          placeholder="Your Email *"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none text-sm"
                          required
                        />
                        <ValidationError
                          prefix="Email"
                          field="email"
                          errors={state.errors}
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number *"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none text-sm"
                          required
                        />
                        <ValidationError
                          prefix="Phone"
                          field="phone"
                          errors={state.errors}
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <textarea
                          name="message"
                          placeholder="Your Message *"
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none resize-none text-sm"
                          required
                        />
                        <ValidationError
                          prefix="Message"
                          field="message"
                          errors={state.errors}
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>

                      {state.errors &&
                        Object.keys(state.errors).length > 0 && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            ⚠️ Please fix the errors above and try again.
                          </div>
                        )}

                      <button
                        type="submit"
                        disabled={state.submitting}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                      >
                        {state.submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Contact Info */}
                <div className="bg-gradient-to-br from-pink-600 to-purple-600 p-6 md:p-8 rounded-2xl shadow-lg text-white flex flex-col justify-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">
                    Contact Information
                  </h2>

                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-sm">
                          Phone
                        </p>
                        <a
                          href={`tel:${businessPhone}`}
                          className="text-pink-100 hover:text-white transition-colors text-sm"
                        >
                          {businessPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        <MessageCircle size={20} />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-sm">
                          WhatsApp
                        </p>
                        <a
                          href={`https://wa.me/${whatsappNumber.replace(
                            /[^0-9]/g,
                            '',
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-100 hover:text-white transition-colors text-sm"
                        >
                          {whatsappNumber}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-sm">
                          Email
                        </p>
                        <a
                          href={`mailto:${businessEmail}`}
                          className="text-pink-100 hover:text-white transition-colors text-sm break-all"
                        >
                          {businessEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-sm">
                          Address
                        </p>
                        <p className="text-pink-100 text-sm">
                          {businessAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-sm">
                          Business Hours
                        </p>
                        <p className="text-pink-100 text-sm">
                          {settings?.businessHours ||
                            'Mon-Sun: 9 AM - 9 PM'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {settings?.enableWhatsAppOrders !== false && (
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(
                        /[^0-9]/g,
                        '',
                      )}?text=Hi! I want to order a cake from ${businessName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 bg-white text-pink-600 px-6 py-3 rounded-xl font-bold hover:bg-yellow-300 hover:text-gray-900 transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <MessageCircle size={18} />
                      Order via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
}
