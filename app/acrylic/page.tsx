import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageContent } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('acrylic');

export default async function AcrylicPage() {
  const { services } = await getPublicPageContent();
  return <ServiceLandingBody slug="acrylic" services={services} />;
}
