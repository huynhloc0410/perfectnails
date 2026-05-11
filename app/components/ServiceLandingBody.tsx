'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import InnerPageHero from './InnerPageHero';
import JsonLd from './JsonLd';
import { ServiceMenuCard } from './ServiceMenuCard';
import type { CmsService } from '@/lib/cmsSiteTypes';
import { fetchCmsSite } from '@/lib/cms/site-client';
import { filterServicesForLandingSlug } from '@/lib/site/service-landing-filter';
import { readLocalStorageJson } from '@/lib/storage/local-json';
import { SITE_BRAND_NAME, SITE_PUBLIC_URL, SITE_SCHEMA_POSTAL_ADDRESS, siteAbsoluteUrl } from '@/lib/site/branding';
import {
  SERVICE_LANDING_PAGES,
  type ServiceSlug,
} from '@/lib/site/service-landing-pages';

function buildServiceJsonLd(slug: ServiceSlug) {
  const p = SERVICE_LANDING_PAGES[slug];
  const url = siteAbsoluteUrl(`/${slug}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: `${p.heroTitle} — ${SITE_BRAND_NAME}`,
        description: p.metaDescription,
        url,
        provider: { '@id': `${SITE_PUBLIC_URL}/#salon` },
        areaServed: {
          '@type': 'City',
          name: SITE_SCHEMA_POSTAL_ADDRESS.addressLocality,
          containedInPlace: {
            '@type': 'State',
            name: 'Arizona',
          },
        },
      },
    ],
  };
}

function buildOffersItemListJsonLd(slug: ServiceSlug, services: CmsService[]) {
  const url = siteAbsoluteUrl(`/${slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#menu-items`,
    name: `${SERVICE_LANDING_PAGES[slug].heroTitle} menu — ${SITE_BRAND_NAME}`,
    numberOfItems: services.length,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Offer',
        name: service.name,
        description: service.description || undefined,
        price: service.price,
        priceCurrency: 'USD',
        url: `${url}#service-${service.id}`,
      },
    })),
  };
}

export default function ServiceLandingBody({ slug }: { slug: ServiceSlug }) {
  const copy = SERVICE_LANDING_PAGES[slug];
  const [services, setServices] = useState<CmsService[]>([]);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site && Array.isArray(data.site.services) && !data.error) {
          setServices(data.site.services as CmsService[]);
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      const list = readLocalStorageJson<CmsService[]>('admin-services');
      if (Array.isArray(list)) setServices(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterServicesForLandingSlug(services, slug),
    [services, slug],
  );

  const jsonLdPayload = useMemo(() => {
    const base = buildServiceJsonLd(slug);
    if (filtered.length === 0) return base;
    const graph = [...(base['@graph'] as object[]), buildOffersItemListJsonLd(slug, filtered)];
    return { '@context': 'https://schema.org', '@graph': graph };
  }, [slug, filtered]);

  return (
    <>
      <JsonLd data={jsonLdPayload} />
      <div>
        <InnerPageHero
          breadcrumbLabel={copy.breadcrumbLabel}
          title={copy.heroTitle}
          subtitle={copy.subtitle}
        />

        <article className="container mx-auto border-t border-lux-line/35 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-base leading-relaxed text-lux-espressoLight sm:text-lg">{copy.intro}</p>

            <h2 className="mt-10 font-display text-2xl font-medium text-lux-espresso">What to expect</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-lux-espressoLight">
              {copy.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <section className="mt-12 border-t border-lux-line/35 pt-10" aria-labelledby="category-menu-heading">
              <h2 id="category-menu-heading" className="font-display text-2xl font-medium text-lux-espresso">
                Book {copy.heroTitle.toLowerCase()}
              </h2>
              <p className="mt-2 text-sm text-lux-espressoLight/90">
                Prices and timing from your menu. Tap a card for details, then book the exact service.
              </p>

              {filtered.length === 0 ? (
                <div className="mt-8 rounded-xl border border-champagne-200/90 bg-champagne-50/40 px-5 py-8 text-center">
                  <p className="text-lux-espressoLight">
                    No matching menu items found for this category yet. See the full menu or book a general appointment — we’ll confirm details when you arrive.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href="/services"
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-champagne-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-champagne-700"
                    >
                      View all services
                    </Link>
                    <Link
                      href={`/booking?service=${encodeURIComponent(copy.heroTitle)}`}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-champagne-600 bg-white px-8 py-3 text-sm font-semibold text-champagne-700 transition hover:bg-champagne-50"
                      >
                      Book general — {copy.heroTitle}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3 lg:gap-8">
                  {filtered.map((service) => (
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
              )}
            </section>

            <p className="mt-10 text-base leading-relaxed text-lux-espressoLight">{copy.closing}</p>

            <nav
              className="mt-10 flex flex-col gap-3 rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/50 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Service pages"
            >
              <p className="text-sm font-medium text-lux-espresso">Explore more services</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link className="font-semibold text-champagne-700 underline-offset-4 hover:underline" href="/pedicure">
                  Pedicure
                </Link>
                <Link className="font-semibold text-champagne-700 underline-offset-4 hover:underline" href="/manicure">
                  Manicure
                </Link>
                <Link className="font-semibold text-champagne-700 underline-offset-4 hover:underline" href="/builder-gel">
                  Builder gel
                </Link>
                <Link className="font-semibold text-champagne-700 underline-offset-4 hover:underline" href="/acrylic">
                  Acrylic
                </Link>
                <Link className="font-semibold text-champagne-700 underline-offset-4 hover:underline" href="/services">
                  Full menu
                </Link>
              </div>
            </nav>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/booking?service=${encodeURIComponent(copy.heroTitle)}`}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-champagne-600 px-8 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-champagne-700"
              >
                Book {copy.heroTitle}
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-champagne-600 bg-white px-8 py-3 text-center text-sm font-semibold text-champagne-700 transition hover:bg-champagne-50"
              >
                Contact
              </Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
