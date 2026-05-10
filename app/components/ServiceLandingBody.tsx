import Link from 'next/link';
import InnerPageHero from './InnerPageHero';
import JsonLd from './JsonLd';
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

export default function ServiceLandingBody({ slug }: { slug: ServiceSlug }) {
  const copy = SERVICE_LANDING_PAGES[slug];

  return (
    <>
      <JsonLd data={buildServiceJsonLd(slug)} />
      <div>
        <InnerPageHero
          breadcrumbLabel={copy.breadcrumbLabel}
          title={copy.heroTitle}
          subtitle={copy.subtitle}
        />

        <article className="container mx-auto border-t border-lux-line/35 px-6 py-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-base leading-relaxed text-lux-espressoLight sm:text-lg">{copy.intro}</p>

            <h2 className="mt-10 font-display text-2xl font-medium text-lux-espresso">What to expect</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-lux-espressoLight">
              {copy.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p className="mt-8 text-base leading-relaxed text-lux-espressoLight">{copy.closing}</p>

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
