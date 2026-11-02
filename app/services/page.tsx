import JsonLd from '../components/JsonLd';
import type { CmsService } from '@/lib/cmsSiteTypes';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';
import { getPublicPageSnapshot } from '@/lib/site/publicPageCache';
import ServicesCatalog from './ServicesCatalog';

function buildServiceSchema(services: CmsService[]) {
  return {
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
}

export default async function ServicesPage() {
  const { services } = await getPublicPageSnapshot();

  return (
    <>
      <JsonLd data={buildServiceSchema(services)} />
      <ServicesCatalog services={services} />
    </>
  );
}
