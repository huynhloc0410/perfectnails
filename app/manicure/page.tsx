import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageContent } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('manicure');

export default async function ManicurePage() {
  const { services } = await getPublicPageContent();
  return <ServiceLandingBody slug="manicure" services={services} />;
}
