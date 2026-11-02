import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageSnapshot } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('builder-gel');

export default async function BuilderGelPage() {
  const { services } = await getPublicPageSnapshot();
  return <ServiceLandingBody slug="builder-gel" services={services} />;
}
