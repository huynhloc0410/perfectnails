'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InnerPageHero from '../components/InnerPageHero';
import { ServiceMenuCard } from '../components/ServiceMenuCard';
import type { CmsService } from '@/lib/cmsSiteTypes';
import { fetchPublicSiteData } from '@/lib/cms/site-client';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export default function Services() {
  const [services, setServices] = useState<CmsService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPublicSiteData();
        if (cancelled) return;
        if (data.configured && data.site && Array.isArray(data.site.services) && !data.error) {
          const servicesList = data.site.services as CmsService[];
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
        const servicesList: CmsService[] = JSON.parse(savedServices);
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
  }, {} as Record<string, CmsService[]>);

  // Services without category
  const uncategorizedServices = services.filter(s => !s.category || s.category.trim() === '');

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    '@id': `${siteAbsoluteUrl('/services')}#catalog`,
    name: SITE_BRAND_NAME,
    description: 'Professional nail salon services in Phoenix, Arizona',
    url: siteAbsoluteUrl('/services'),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Nail Services',
      itemListElement: services.map((service, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.description || `${service.name} service at ${SITE_BRAND_NAME}`,
          provider: {
            '@type': 'NailSalon',
            name: SITE_BRAND_NAME,
          },
          areaServed: {
            '@type': 'City',
            name: 'Phoenix',
            containedInPlace: {
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
        <nav
          className="mx-auto mb-10 max-w-5xl rounded-xl border border-champagne-200/80 bg-champagne-50/50 px-4 py-3 text-center text-sm text-lux-espressoLight md:text-left"
          aria-label="Popular treatments"
        >
          <span className="font-semibold text-lux-espresso">Popular: </span>
          <Link className="font-medium text-champagne-800 underline-offset-4 hover:underline" href="/pedicure">
            Pedicure
          </Link>
          <span className="mx-1.5 text-champagne-400" aria-hidden>
            ·
          </span>
          <Link className="font-medium text-champagne-800 underline-offset-4 hover:underline" href="/manicure">
            Manicure
          </Link>
          <span className="mx-1.5 text-champagne-400" aria-hidden>
            ·
          </span>
          <Link className="font-medium text-champagne-800 underline-offset-4 hover:underline" href="/builder-gel">
            Builder gel
          </Link>
          <span className="mx-1.5 text-champagne-400" aria-hidden>
            ·
          </span>
          <Link className="font-medium text-champagne-800 underline-offset-4 hover:underline" href="/acrylic">
            Acrylic
          </Link>
        </nav>
      
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
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3 lg:gap-8">
                {servicesByCategory[category].map((service) => (
                  <ServiceMenuCard
                    key={service.id}
                    service={service}
                    expanded={expandedServiceId === service.id}
                    onToggle={() =>
                      setExpandedServiceId((id) => (id === service.id ? null : service.id))
                    }
                  />
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
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3 lg:gap-8">
                {uncategorizedServices.map((service) => (
                  <ServiceMenuCard
                    key={service.id}
                    service={service}
                    expanded={expandedServiceId === service.id}
                    onToggle={() =>
                      setExpandedServiceId((id) => (id === service.id ? null : service.id))
                    }
                  />
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
