'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InnerPageHero from '../components/InnerPageHero';
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
      <InnerPageHero
        breadcrumbLabel="Services"
        title="Our Services"
        subtitle="Explore our comprehensive range of professional nail care services, organized by category."
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
      
      {services.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-lux-espressoLight">No services available at the moment.</p>
          <p className="mt-2 text-sm text-lux-espressoLight/80">Please check back later or contact us for more information.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Services grouped by category */}
          {categories.map((category) => (
            <section key={category} className="scroll-mt-20 border-l-2 border-champagne-600/35 pl-4 md:pl-6">
              <div className="mb-6">
                <h2 className="mb-2 font-display text-3xl font-medium text-champagne-800">{category}</h2>
                <div className="h-1 w-20 rounded bg-gradient-to-r from-champagne-600 to-champagne-500"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesByCategory[category].map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0"
                  >
                    <h3 className="mb-2 font-display text-xl font-medium text-lux-espresso">{service.name}</h3>
                    {service.description && (
                      <p className="mb-4 line-clamp-2 text-sm text-lux-espressoLight/90">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <span className="font-display text-2xl font-medium text-champagne-800">
                          $
                          {Number(
                            typeof service.price === 'number'
                              ? service.price
                              : parseFloat(String(service.price))
                          ).toFixed(2)}
                        </span>
                        {service.duration !== 0 && (
                          <p className="mt-1 text-sm text-lux-espressoLight/75">{service.duration || 45} minutes</p>
                        )}
                      </div>
                      <Link
                        href={`/booking?service=${encodeURIComponent(service.name)}`}
                        className="rounded-xl bg-champagne-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-champagne-700"
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
                <h2 className="mb-2 font-display text-3xl font-medium text-champagne-800">Other Services</h2>
                <div className="h-1 w-20 rounded bg-gradient-to-r from-champagne-600 to-champagne-500"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uncategorizedServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0"
                  >
                    <h3 className="mb-2 font-display text-xl font-medium text-lux-espresso">{service.name}</h3>
                    {service.description && (
                      <p className="mb-4 line-clamp-2 text-sm text-lux-espressoLight/90">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <span className="font-display text-2xl font-medium text-champagne-800">
                          $
                          {Number(
                            typeof service.price === 'number'
                              ? service.price
                              : parseFloat(String(service.price))
                          ).toFixed(2)}
                        </span>
                        {service.duration !== 0 && (
                          <p className="mt-1 text-sm text-lux-espressoLight/75">{service.duration || 45} minutes</p>
                        )}
                      </div>
                      <Link
                        href={`/booking?service=${encodeURIComponent(service.name)}`}
                        className="rounded-xl bg-champagne-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-champagne-700"
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
