import Link from 'next/link';
import { SITE_BRAND_NAME } from '@/lib/site/branding';
import InnerPageHero from '../components/InnerPageHero';

export default function PrivacyPage() {
  return (
    <div>
      <InnerPageHero
        breadcrumbLabel="Privacy"
        title="Privacy Policy"
        subtitle={`How ${SITE_BRAND_NAME} handles your personal information.`}
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <article className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <p className="text-base leading-relaxed text-lux-espressoLight sm:text-lg">
              At {SITE_BRAND_NAME}, we respect your privacy and are committed to protecting your personal information.
            </p>
          </article>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Information We Collect</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">We may collect:</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Name</li>
              <li>Phone number</li>
              <li>Appointment details</li>
            </ul>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">How We Use Your Information</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">We use your information to:</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Confirm appointments</li>
              <li>Send appointment reminders</li>
              <li>Provide customer support</li>
              <li>Communicate important updates regarding services</li>
            </ul>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">SMS Consent</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">
              By providing your phone number, you consent to receive SMS messages related to your appointments and
              customer care.
            </p>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">
              Message frequency may vary. Message and data rates may apply.
            </p>
            <p className="leading-relaxed text-lux-espressoLight">
              Reply <span className="font-medium text-lux-espresso">STOP</span> to unsubscribe at any time. Reply{' '}
              <span className="font-medium text-lux-espresso">HELP</span> for assistance.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Information Sharing</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              We do not sell, rent, or share your personal information with third parties for marketing purposes.
            </p>
          </section>

          <section className="rounded-xl border border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-lux-cream/60 to-champagne-100/80 p-8 shadow-md ring-1 ring-champagne-200/40">
            <h2 className="mb-4 text-center font-display text-2xl font-medium text-lux-espresso">Contact Us</h2>
            <p className="text-center leading-relaxed text-lux-espressoLight">
              If you have questions regarding this Privacy Policy, please contact us through our{' '}
              <Link
                href="/contact"
                className="font-medium text-champagne-700 underline-offset-2 hover:text-champagne-800 hover:underline"
              >
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
