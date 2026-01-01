'use client';

import Link from 'next/link';
import { Instagram, Facebook, Phone, Mail, MapPin, Twitter, Youtube, Linkedin } from 'lucide-react';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/hooks/useSettings';

export default function Footer() {
  const { settings, loading } = useSettings();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.features.enableNewsletter) {
      showError('Newsletter subscription is currently disabled');
      return;
    }
    
    setSubscribing(true);
    
    try {
      await addDoc(collection(db, 'newsletter'), {
        email,
        subscribedAt: serverTimestamp(),
        status: 'active'
      });
      showSuccess('🎉 Thank you for subscribing! Check your inbox for exclusive offers.');
      setEmail('');
    } catch (error) {
      console.error('Error subscribing:', error);
      showError('❌ Failed to subscribe. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const companyLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'Our Cakes', href: '/cakes' },
    { label: 'Custom Orders', href: '/custom-cakes' },
    { label: 'Services', href: '/services' },
  ];

  const supportLinks = [
    { label: 'Contact Us', href: '/contact' },
   //  { label: 'FAQs', href: '/faq' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Claim Order', href: '/claim-order' },
    { label: 'Orders', href: '/orders' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund' },
    { label: 'Cookie Policy', href: '/cookies' },
  ];

  // Show loading state or default content if settings are loading
  if (loading) {
    return (
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
       

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12">
          {/* About Section */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center space-x-2 mb-4 group">
              <span className="text-4xl group-hover:scale-110 transition-transform">🍰</span>
              <span className="text-2xl font-bold text-pink-400 group-hover:text-pink-300 transition-colors">
                {settings.businessName}
              </span>
            </Link>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {settings.tagline}
            </p>
            
            {/* Social Media Links */}
            <div className="flex flex-wrap gap-3">
              {settings.socialMedia.instagram && (
                <a
                  href={settings.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-pink-600 p-3 rounded-full hover:bg-pink-700 transition-all transform hover:scale-110 shadow-lg hover:shadow-pink-500/50"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram size={20} />
                </a>
              )}
              {settings.socialMedia.facebook && (
                <a
                  href={settings.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 p-3 rounded-full hover:bg-blue-700 transition-all transform hover:scale-110 shadow-lg hover:shadow-blue-500/50"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook size={20} />
                </a>
              )}
              {settings.socialMedia.twitter && (
                <a
                  href={settings.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-sky-600 p-3 rounded-full hover:bg-sky-700 transition-all transform hover:scale-110 shadow-lg hover:shadow-sky-500/50"
                  aria-label="Follow us on Twitter"
                >
                  <Twitter size={20} />
                </a>
              )}
              {settings.socialMedia.youtube && (
                <a
                  href={settings.socialMedia.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 p-3 rounded-full hover:bg-red-700 transition-all transform hover:scale-110 shadow-lg hover:shadow-red-500/50"
                  aria-label="Subscribe on YouTube"
                >
                  <Youtube size={20} />
                </a>
              )}
              {settings.socialMedia.linkedin && (
                <a
                  href={settings.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-700 p-3 rounded-full hover:bg-blue-800 transition-all transform hover:scale-110 shadow-lg hover:shadow-blue-500/50"
                  aria-label="Connect on LinkedIn"
                >
                  <Linkedin size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Links Section */}
          <div className="lg:col-span-8">
            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {/* Company Links */}
              <div>
                <h4 className="text-lg font-bold mb-4 text-pink-400">Company</h4>
                <ul className="space-y-3">
                  {companyLinks.map((link, index) => (
                    <li key={index}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-pink-400 transition-colors flex items-center group"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-pink-400 mr-0 group-hover:mr-2 transition-all"></span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Links */}
              <div>
                <h4 className="text-lg font-bold mb-4 text-pink-400">Support</h4>
                <ul className="space-y-3">
                  {supportLinks.map((link, index) => (
                    <li key={index}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-pink-400 transition-colors flex items-center group"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-pink-400 mr-0 group-hover:mr-2 transition-all"></span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-bold mb-4 text-pink-400">Contact</h4>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3 text-gray-400 group">
                    <Phone size={20} className="text-pink-400 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <a href={`tel:${settings.phone}`} className="hover:text-pink-400 transition-colors">
                      {settings.phone}
                    </a>
                  </li>
                  <li className="flex items-start space-x-3 text-gray-400 group">
                    <Mail size={20} className="text-pink-400 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <a href={`mailto:${settings.email}`} className="hover:text-pink-400 transition-colors break-all">
                      {settings.email}
                    </a>
                  </li>
                  <li className="flex items-start space-x-3 text-gray-400 group">
                    <MapPin size={20} className="text-pink-400 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span>{settings.address}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-base font-bold mb-3 text-pink-400">Company</h4>
                  <ul className="space-y-2">
                    {companyLinks.map((link, index) => (
                      <li key={index}>
                        <Link
                          href={link.href}
                          className="text-gray-400 hover:text-pink-400 transition-colors text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-base font-bold mb-3 text-pink-400">Support</h4>
                  <ul className="space-y-2">
                    {supportLinks.map((link, index) => (
                      <li key={index}>
                        <Link
                          href={link.href}
                          className="text-gray-400 hover:text-pink-400 transition-colors text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contact Info Mobile */}
              <div>
                <h4 className="text-base font-bold mb-3 text-pink-400">Contact</h4>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3 text-gray-400">
                    <Phone size={18} className="text-pink-400 flex-shrink-0" />
                    <a href={`tel:${settings.phone}`} className="hover:text-pink-400 transition-colors text-sm">
                      {settings.phone}
                    </a>
                  </li>
                  <li className="flex items-center space-x-3 text-gray-400">
                    <Mail size={18} className="text-pink-400 flex-shrink-0" />
                    <a href={`mailto:${settings.email}`} className="hover:text-pink-400 transition-colors text-sm break-all">
                      {settings.email}
                    </a>
                  </li>
                  <li className="flex items-start space-x-3 text-gray-400">
                    <MapPin size={18} className="text-pink-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{settings.address}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {legalLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-gray-400 hover:text-pink-400 transition-colors text-xs md:text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-8 text-center">
          <p className="text-gray-400 mb-2 text-sm md:text-base">
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Made with <span className="text-pink-500 animate-pulse">❤️</span> by{' '}
            <a
              href="https://instagram.com/thrillyverse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 font-semibold transition-colors"
            >
              Thrillyverse
            </a>
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2 text-gray-500 text-xs md:text-sm">
            <span>🔒 Secure Payments</span>
            <span>•</span>
            <span>🚚 Fast Delivery</span>
            <span>•</span>
            <span>⭐ 4.9/5 Rating</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
