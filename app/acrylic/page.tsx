import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';

export const metadata = serviceLandingMetadata('acrylic');

export default function AcrylicPage() {
  return <ServiceLandingBody slug="acrylic" />;
}
