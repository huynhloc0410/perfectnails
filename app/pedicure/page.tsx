import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageContent } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('pedicure');

export default async function PedicurePage() {
  const { services } = await getPublicPageContent();
  return <ServiceLandingBody slug="pedicure" services={services} />;
}
