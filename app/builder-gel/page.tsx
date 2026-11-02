import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';
import { getPublicPageContent } from '@/lib/site/publicPageCache';

export const metadata = serviceLandingMetadata('builder-gel');

export default async function BuilderGelPage() {
  const { services } = await getPublicPageContent();
  return <ServiceLandingBody slug="builder-gel" services={services} />;
}
