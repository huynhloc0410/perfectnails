import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageSnapshot } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('acrylic');

export default async function AcrylicPage() {
  const { services } = await getPublicPageSnapshot();
  return <ServiceLandingBody slug="acrylic" services={services} />;
}
