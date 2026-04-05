'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeroRule from '../components/PageHeroRule';
import {
  SITE_DEFAULT_ADDRESS,
  migrateLegacyStoredContactAddress,
} from '../lib/siteContact';
import { fetchCmsSite } from '../lib/cmsSiteClient';

interface ContactContent {
  address: string;
  phone: string;
  email: string;
  hours: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
}

export default function Contact() {
  const [contact, setContact] = useState<ContactContent>({
    address: '',
    phone: '',
    email: '',
    hours: '',
    socialMedia: { facebook: '', instagram: '', twitter: '' },
  });

  useEffect(() => {
    migrateLegacyStoredContactAddress();
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site?.contact && !data.error) {
          const c = data.site.contact;
          setContact({
            address: c.address || '',
            phone: c.phone || '',
            email: c.email || '',
            hours: c.hours || '',
            socialMedia: {
              facebook: c.socialMedia?.facebook || '',
              instagram: c.socialMedia?.instagram || '',
              twitter: c.socialMedia?.twitter || '',
            },
          });
          return;
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) {
        const savedContact = localStorage.getItem('admin-contact');
        if (savedContact) setContact(JSON.parse(savedContact));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultAddress = SITE_DEFAULT_ADDRESS;
  const displayAddress = contact.address || defaultAddress;
  
  // Format address for Google Maps
  const mapAddress = encodeURIComponent(displayAddress);

  // Generate LocalBusiness structured data and inject it
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const localBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: 'Perfect Nails',
      description: 'Professional nail salon in Phoenix, Arizona offering manicures, pedicures, nail art, and premium nail care services',
      url: 'https://perfectnails.com',
      telephone: contact.phone || '+1-623-302-2156',
      email: contact.email || '',
      address: {
        '@type': 'PostalAddress',
        streetAddress: contact.address || '4030 E Bell Rd #110',
        addressLocality: 'Phoenix',
        addressRegion: 'AZ',
        postalCode: '85032',
        addressCountry: 'US',
      },
      priceRange: '$$',
      openingHours: contact.hours ? contact.hours.split('\n').map((line: string) => line.trim()).filter((line: string) => line) : ['Mo-Fr 09:00-19:00', 'Sa-Su 10:00-18:00'],
      image: 'https://perfectnails.com/logo.png',
      sameAs: [
        contact.socialMedia.facebook,
        contact.socialMedia.instagram,
        contact.socialMedia.twitter,
      ].filter(Boolean),
    };

    // Remove existing script if any
    const existingScript = document.getElementById('local-business-schema');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject script
    const script = document.createElement('script');
    script.id = 'local-business-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(localBusinessSchema);
    document.head.appendChild(script);

    // Cleanup
    return () => {
      const scriptToRemove = document.getElementById('local-business-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [contact]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-stone-100 to-champagne-100 py-3 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-champagne-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-champagne-200/50 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'Contact' }]} />
          <div className="text-center mb-1 mt-0.5">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">Contact Us</h2>
            <PageHeroRule />
            <p className="text-sm text-gray-600 max-w-2xl mx-auto mt-3">
              Get in touch with us - we'd love to hear from you
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10 border-t border-champagne-300/25">
      <div className="max-w-4xl mx-auto">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-lg border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/50">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Get in Touch</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-1">Address</h4>
            <p className="text-gray-600">{displayAddress}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-champagne-600 hover:text-champagne-700 text-sm mt-1 inline-block"
            >
              Get Directions →
            </a>
          </div>
          
          {contact.phone && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-1">Phone</h4>
              <a href={`tel:${contact.phone}`} className="text-champagne-600 hover:text-champagne-700">
                {contact.phone}
              </a>
            </div>
          )}
          
          {contact.email && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-1">Email</h4>
              <a href={`mailto:${contact.email}`} className="text-champagne-600 hover:text-champagne-700">
                {contact.email}
              </a>
            </div>
          )}
          
          {contact.hours && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Business Hours</h4>
              <div className="text-gray-600 space-y-1">
                {contact.hours.split('\n').map((line, index) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  
                  // Format: "Monday - Friday: 9:00 AM - 7:00 PM"
                  const parts = trimmedLine.split(':');
                  if (parts.length >= 2) {
                    const day = parts[0].trim();
                    const time = parts.slice(1).join(':').trim();
                    return (
                      <div key={index} className="flex justify-between items-start">
                        <span className="font-medium text-gray-700">{day}:</span>
                        <span className="ml-4 text-right">{time}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={index}>{trimmedLine}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/50">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Follow Us</h3>
          
          <div className="space-y-3">
            {contact.socialMedia.facebook && (
              <a
                href={contact.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-700"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            )}
            
            {contact.socialMedia.instagram && (
              <a
                href={contact.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-champagne-600 hover:text-champagne-700"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            )}
            
            {contact.socialMedia.twitter && (
              <a
                href={contact.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-400 hover:text-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </a>
            )}
          </div>

          {!contact.address && !contact.phone && !contact.email && !contact.hours && 
           !contact.socialMedia.facebook && !contact.socialMedia.instagram && !contact.socialMedia.twitter && (
            <p className="text-gray-500 text-sm mt-4">
              Contact information will appear here once updated in the admin panel.
            </p>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-8 overflow-hidden rounded-lg border border-champagne-300/45 bg-white shadow-md ring-1 ring-champagne-100/50">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 p-6 pb-0">Find Us</h3>
        <div className="w-full h-96 relative">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${mapAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className="absolute inset-0"
          ></iframe>
        </div>
        <div className="p-6 pt-4">
          <p className="text-gray-600 text-sm">
            Visit us at <span className="font-semibold">{displayAddress}</span>
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-champagne-600 hover:text-champagne-700 text-sm mt-2 inline-block"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
