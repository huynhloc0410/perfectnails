import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';

export const metadata = serviceLandingMetadata('manicure');

export default function ManicurePage() {
  return <ServiceLandingBody slug="manicure" />;
}
