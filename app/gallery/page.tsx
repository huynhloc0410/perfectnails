'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import { fetchCmsSite } from '../lib/cmsSiteClient';

function resolveImageSrc(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (typeof window !== 'undefined' && u.startsWith('/')) {
    return `${window.location.origin}${u}`;
  }
  return u;
}

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (
          data.configured &&
          data.site &&
          Array.isArray(data.site.gallery) &&
          data.site.gallery.length > 0 &&
          !data.error
        ) {
          setImages(data.site.gallery as string[]);
          return;
        }
      } catch {
        /* fallback */
      }
      if (cancelled) return;
      const savedGallery = localStorage.getItem('admin-gallery');
      if (savedGallery) {
        try {
          const parsed = JSON.parse(savedGallery) as string[];
          if (Array.isArray(parsed)) setImages(parsed);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
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
            {images.map((url, index) => {
              const src = resolveImageSrc(url);
              return (
                <div key={`${src}-${index}`} className="relative group overflow-hidden rounded-lg">
                  <img
                    src={src}
                    alt={`Gallery image ${index + 1} — Perfect Nails`}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300 bg-gray-100"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
