import ServiceLandingBody from '../components/ServiceLandingBody';
import { serviceLandingMetadata } from '@/lib/site/service-landing-pages';

export const metadata = serviceLandingMetadata('pedicure');

export default function PedicurePage() {
  return <ServiceLandingBody slug="pedicure" />;
}
