'use client';

import InnerPageHero from '../components/InnerPageHero';

export default function PolicyPage() {
  return (
    <div>
      <InnerPageHero
        breadcrumbLabel="Policy"
        title="Salon Policies"
        subtitle="Please review our policies before your visit."
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <article className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <p className="text-base leading-relaxed text-lux-espressoLight sm:text-lg">
              At Perfect Nails &amp; Spa, we are committed to providing high-quality services in a relaxing and professional environment.
              To ensure the best experience for all clients, please review our salon policies below.
            </p>
          </article>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Appointments &amp; Walk-Ins</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              We welcome both appointments and walk-ins. However, we highly recommend booking in advance to secure your preferred time and technician.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Late Policy</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">If you arrive more than 10–15 minutes late, we may need to:</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Modify your service, or</li>
              <li>Reschedule your appointment</li>
            </ul>
            <p className="mt-4 leading-relaxed text-lux-espressoLight">
              This helps us stay on schedule and respect all clients’ time.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Refund &amp; Service Guarantee</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">We do not offer refunds on completed services. However, your satisfaction is important to us.</p>
            <p className="leading-relaxed text-lux-espressoLight">
              If you experience any issues with your service, please contact us within 14 days, and we will gladly fix it at no additional cost.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Health &amp; Safety</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">Your safety is our priority.</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>All tools are sanitized and disinfected according to state regulations.</li>
              <li>Please inform us of any allergies, injuries, or medical conditions before your service.</li>
              <li>We reserve the right to refuse service if any condition may pose a risk.</li>
            </ul>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Children &amp; Guests</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">For safety and relaxation:</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Children must be supervised at all times.</li>
              <li>Please limit additional guests unless they are receiving a service.</li>
            </ul>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Personal Belongings</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              We are not responsible for lost or damaged personal items. Please keep your valuables with you at all times.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Payment Methods</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">We accept:</p>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Cash</li>
              <li>Credit/Debit Cards</li>
              <li>Apple Pay</li>
            </ul>
            <p className="mt-4 leading-relaxed text-lux-espressoLight">
              Tips are greatly appreciated and can be given in cash or added to your card payment.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Right to Refuse Service</h2>
            <p className="leading-relaxed text-lux-espressoLight">
              We reserve the right to refuse service to anyone displaying inappropriate behavior, arriving under the influence, or not respecting salon policies.
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Promotions &amp; Discounts</h2>
            <ul className="list-inside list-disc space-y-2 text-lux-espressoLight">
              <li>Promotions (such as 20% off specials) cannot be combined with other offers unless stated otherwise.</li>
              <li>Discounts must be mentioned at checkout.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-lux-cream/60 to-champagne-100/80 p-8 shadow-md ring-1 ring-champagne-200/40">
            <h2 className="mb-4 text-center font-display text-2xl font-medium text-lux-espresso">Contact Us</h2>
            <p className="text-center leading-relaxed text-lux-espressoLight">
              If you have any questions about our policies, please contact us:
            </p>
            <div className="mt-5 space-y-1.5 text-center text-lux-espressoLight">
              <p className="font-semibold text-lux-espresso">Perfect Nails &amp; Spa</p>
              <p>
                <span className="font-medium text-lux-espresso">Phone:</span> 623-302-2156
              </p>
              <p>
                <span className="font-medium text-lux-espresso">Website:</span> perfectnailsandspas.com
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

