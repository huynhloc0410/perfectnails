import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageSnapshot } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('pedicure');

export default async function PedicurePage() {
  const { services } = await getPublicPageSnapshot();
  return <ServiceLandingBody slug="pedicure" services={services} />;
}
