'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeroRule from '../components/PageHeroRule';
import { fetchCmsSite } from '../lib/cmsSiteClient';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  duration: number;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site && Array.isArray(data.site.services) && !data.error) {
          const servicesList = data.site.services as Service[];
          setServices(servicesList);
          const uniqueCategories = Array.from(
            new Set(
              servicesList
                .map((s) => (s.category || '').trim())
                .filter((cat) => cat !== '')
            )
          );
          setCategories(uniqueCategories);
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      const savedServices = localStorage.getItem('admin-services');
      if (savedServices) {
        const servicesList: Service[] = JSON.parse(savedServices);
        setServices(servicesList);
        const uniqueCategories = Array.from(
          new Set(
            servicesList
              .map((s) => (s.category || '').trim())
              .filter((cat) => cat !== '')
          )
        );
        setCategories(uniqueCategories);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group services by category (only non-empty category strings)
  const servicesByCategory = categories.reduce((acc, category) => {
    acc[category] = services.filter(
      (s) => (s.category || '').trim() === category
    );
    return acc;
  }, {} as Record<string, Service[]>);

  // Services without category
  const uncategorizedServices = services.filter(s => !s.category || s.category.trim() === '');

  // Generate Service schema for structured data
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: 'Perfect Nails',
    description: 'Professional nail salon services in Glendale, Arizona',
    url: 'https://perfectnails.com/services',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Nail Services',
      itemListElement: services.map((service, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.description || `${service.name} service at Perfect Nails`,
          provider: {
            '@type': 'BeautySalon',
            name: 'Perfect Nails',
          },
          areaServed: {
            '@type': 'City',
            name: 'Glendale',
            containedIn: {
              '@type': 'State',
              name: 'Arizona',
            },
          },
        },
        price: service.price,
        priceCurrency: 'USD',
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
    <div>
      {/* Hero Section */}
      <section className="relative border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-stone-100 to-champagne-100 py-[0.525rem] overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-champagne-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-champagne-200/50 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'Services' }]} />
          <div className="text-center mb-[0.175rem] mt-[0.175rem]">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">Our Services</h1>
            <PageHeroRule />
            <p className="text-sm text-gray-600 max-w-2xl mx-auto mt-[0.525rem]">
              Explore our comprehensive range of professional nail care services, organized by category
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10 border-t border-champagne-300/25">
      
      {services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No services available at the moment.</p>
          <p className="text-gray-500 text-sm mt-2">Please check back later or contact us for more information.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Services grouped by category */}
          {categories.map((category) => (
            <section key={category} className="scroll-mt-20 border-l-2 border-champagne-600/35 pl-4 md:pl-6">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-champagne-700 mb-2">{category}</h2>
                <div className="h-1 w-20 rounded bg-gradient-to-r from-champagne-600 to-champagne-500"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesByCategory[category].map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0"
                  >
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.name}</h3>
                    {service.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <span className="text-2xl font-bold text-champagne-700">
                          $
                          {Number(
                            typeof service.price === 'number'
                              ? service.price
                              : parseFloat(String(service.price))
                          ).toFixed(2)}
                        </span>
                        {service.duration !== 0 && (
                          <p className="mt-1 text-sm text-gray-500">{service.duration || 45} minutes</p>
                        )}
                      </div>
                      <Link
                        href="/booking"
                        className="px-4 py-2 bg-champagne-500 text-white rounded-lg hover:bg-champagne-600 transition font-semibold text-sm"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Uncategorized services */}
          {uncategorizedServices.length > 0 && (
            <section className="scroll-mt-20 border-l-2 border-champagne-600/35 pl-4 md:pl-6">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-champagne-700 mb-2">Other Services</h2>
                <div className="h-1 w-20 rounded bg-gradient-to-r from-champagne-600 to-champagne-500"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uncategorizedServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0"
                  >
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.name}</h3>
                    {service.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <span className="text-2xl font-bold text-champagne-700">
                          $
                          {Number(
                            typeof service.price === 'number'
                              ? service.price
                              : parseFloat(String(service.price))
                          ).toFixed(2)}
                        </span>
                        {service.duration !== 0 && (
                          <p className="mt-1 text-sm text-gray-500">{service.duration || 45} minutes</p>
                        )}
                      </div>
                      <Link
                        href="/booking"
                        className="px-4 py-2 bg-champagne-500 text-white rounded-lg hover:bg-champagne-600 transition font-semibold text-sm"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
    </>
  );
}
