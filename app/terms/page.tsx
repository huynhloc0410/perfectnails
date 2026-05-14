import { SITE_BRAND_NAME } from '@/lib/site/branding';
import InnerPageHero from '../components/InnerPageHero';

export default function TermsPage() {
  return (
    <div>
      <InnerPageHero
        breadcrumbLabel="Terms"
        title="SMS Terms & Conditions"
        subtitle={`Text messaging terms for ${SITE_BRAND_NAME}.`}
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <article className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <p className="text-base leading-relaxed text-lux-espressoLight sm:text-lg">
              By opting into SMS communications from {SITE_BRAND_NAME}, you agree to receive text messages related to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Appointment confirmations</li>
              <li>Appointment reminders</li>
              <li>Customer care notifications</li>
            </ul>
          </article>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Message Frequency</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              Message frequency may vary depending on your appointments and interactions.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Message &amp; Data Rates</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              Message and data rates may apply depending on your mobile carrier plan.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Opt-Out</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">You may opt out at any time by replying:</p>
            <p className="leading-relaxed text-lux-espressoLight">
              <span className="font-medium text-lux-espresso">STOP</span> to unsubscribe
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Help</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">Reply:</p>
            <p className="leading-relaxed text-lux-espressoLight">
              <span className="font-medium text-lux-espresso">HELP</span> for assistance
            </p>
          </section>

          <section className="rounded-xl border border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-lux-cream/60 to-champagne-100/80 p-8 shadow-md ring-1 ring-champagne-200/40">
            <h2 className="mb-4 text-center font-display text-2xl font-medium text-lux-espresso">Consent</h2>
            <p className="text-center leading-relaxed text-lux-espressoLight">
              SMS consent is not shared with third parties or affiliates for marketing purposes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
