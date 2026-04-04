'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const savedGallery = localStorage.getItem('admin-gallery');
    if (savedGallery) {
      setImages(JSON.parse(savedGallery));
    }
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 py-1.5 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-pink-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-rose-300 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'Gallery' }]} />
          <div className="text-center mb-1 mt-0.5">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">Gallery</h2>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              Browse our beautiful nail art creations and transformations
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10">
      
      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No images in the gallery yet.</p>
          <p className="text-gray-500 text-sm mt-2">Check back soon for our latest work!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group overflow-hidden rounded-lg">
              <img
                src={url}
                alt={`Professional nail art design ${index + 1} by Perfect Nails - Glendale, Arizona nail salon gallery showcasing manicure, pedicure, and nail art work`}
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
