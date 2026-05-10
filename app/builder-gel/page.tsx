import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';

export const metadata = serviceLandingMetadata('builder-gel');

export default function BuilderGelPage() {
  return <ServiceLandingBody slug="builder-gel" />;
}
