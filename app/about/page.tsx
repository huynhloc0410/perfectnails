'use client';

import { useState, useEffect } from 'react';
import InnerPageHero from '../components/InnerPageHero';
import Link from 'next/link';
import { fetchCmsSite } from '../lib/cmsSiteClient';
import { SITE_PUBLIC_URL, siteAbsoluteUrl } from '../lib/siteBranding';

export default function About() {
  const [aboutContent, setAboutContent] = useState({ title: 'About Us', content: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site?.about && !data.error) {
          const a = data.site.about;
          setAboutContent({
            title: a.title || 'About Us',
            content: a.content || '',
          });
          return;
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) {
        const savedAbout = localStorage.getItem('admin-about');
        if (savedAbout) setAboutContent(JSON.parse(savedAbout));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Generate comprehensive structured data for SEO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // AboutPage Schema
    const aboutPageSchema = {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About Perfect Nails',
      description: 'Learn about Perfect Nails, Phoenix\'s premier nail salon. Discover our story, commitment to quality, and expert team dedicated to making you look and feel your best.',
      url: siteAbsoluteUrl('/about'),
      mainEntity: {
        '@type': 'Organization',
        name: 'Perfect Nails',
        description: 'Premier nail salon in Phoenix, Arizona offering professional manicures, pedicures, and nail art services',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '4030 E Bell Rd #110',
          addressLocality: 'Phoenix',
          addressRegion: 'AZ',
          postalCode: '85032',
          addressCountry: 'US',
        },
        url: SITE_PUBLIC_URL,
        telephone: '+1-623-302-2156',
        priceRange: '$$',
        openingHours: 'Mo-Fr 09:00-19:00, Sa-Su 10:00-18:00',
        areaServed: {
          '@type': 'City',
          name: 'Phoenix',
          containedIn: {
            '@type': 'State',
            name: 'Arizona',
          },
        },
      },
    };

    // FAQ Schema
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What services does Perfect Nails offer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Perfect Nails offers a comprehensive range of professional nail care services including manicures, pedicures, Gel X, Gel Builder, Acrylic nails, and custom nail art designs. We serve clients in Phoenix, Arizona and surrounding areas.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where is Perfect Nails located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Perfect Nails is located at 4030 E Bell Rd #110, Phoenix, AZ 85032. We are conveniently located in Phoenix, Arizona.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are Perfect Nails\' business hours?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Perfect Nails is open Monday through Friday from 9:00 AM to 7:00 PM, and Saturday through Sunday from 10:00 AM to 6:00 PM.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I book an appointment at Perfect Nails?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can book an appointment online through our website booking page, or contact us directly by phone. We offer easy online scheduling where you can select your service, choose a technician, pick a date and time that works for you.',
          },
        },
      ],
    };

    // Remove existing scripts
    const existingAboutScript = document.getElementById('about-page-schema');
    const existingFaqScript = document.getElementById('faq-schema');
    if (existingAboutScript) existingAboutScript.remove();
    if (existingFaqScript) existingFaqScript.remove();

    // Inject AboutPage schema
    const aboutScript = document.createElement('script');
    aboutScript.id = 'about-page-schema';
    aboutScript.type = 'application/ld+json';
    aboutScript.text = JSON.stringify(aboutPageSchema);
    document.head.appendChild(aboutScript);

    // Inject FAQ schema
    const faqScript = document.createElement('script');
    faqScript.id = 'faq-schema';
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    // Cleanup
    return () => {
      const aboutToRemove = document.getElementById('about-page-schema');
      const faqToRemove = document.getElementById('faq-schema');
      if (aboutToRemove) aboutToRemove.remove();
      if (faqToRemove) faqToRemove.remove();
    };
  }, []);

  return (
    <div>
      <InnerPageHero breadcrumbLabel="About" title={aboutContent.title || 'About Us'} />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <article className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            {aboutContent.content ? (
              <div className="max-w-none whitespace-pre-line text-base leading-relaxed text-lux-espressoLight sm:text-lg">
                {aboutContent.content}
              </div>
            ) : (
              <>
                <h2 className="mb-4 font-display text-3xl font-medium text-lux-espresso">Welcome to Perfect Nails</h2>
                <p className="mb-4 text-lg leading-relaxed text-lux-espressoLight">
                  Located in <strong className="text-lux-espresso">Phoenix, Arizona</strong>, <strong className="text-lux-espresso">Perfect Nails</strong> is your premier destination for 
                  professional nail care services. We combine artistry, quality products, and exceptional 
                  customer service to create the perfect nail experience.
                </p>
                <p className="mb-4 leading-relaxed text-lux-espressoLight">
                  Our team of <strong className="text-lux-espresso">skilled nail technicians</strong> is dedicated to providing you with the highest quality 
                  nail care services in a relaxing and friendly environment. Whether you're looking for a classic 
                  manicure, a relaxing pedicure, or stunning nail art, our expert professionals are here to make 
                  your vision a reality.
                </p>
                <p className="mb-4 leading-relaxed text-lux-espressoLight">
                  At <strong className="text-lux-espresso">Perfect Nails</strong>, we understand that your nails are a reflection of your personal style. That's why 
                  we offer a comprehensive range of services including <strong className="text-lux-espresso">manicures, pedicures, Gel X, Gel Builder, 
                  Acrylic nails</strong>, and custom nail art designs. We use only the finest products and latest techniques 
                  to ensure lasting results.
                </p>
                <p className="leading-relaxed text-lux-espressoLight">
                  Visit our <Link href="/services" className="font-semibold text-champagne-700 underline decoration-champagne-300/60 underline-offset-4 hover:text-champagne-800">services page</Link> to 
                  explore our offerings, or <Link href="/booking" className="font-semibold text-champagne-700 underline decoration-champagne-300/60 underline-offset-4 hover:text-champagne-800">book an appointment</Link> today 
                  to experience the <strong className="text-lux-espresso">Perfect Nails</strong> difference.
                </p>
              </>
            )}
          </article>

          {/* Our Story Section */}
          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Our Story</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">
              <strong className="text-lux-espresso">Perfect Nails</strong> was founded with a passion for bringing beautiful, professional nail care to the 
              <strong className="text-lux-espresso">Phoenix, Arizona</strong> community. We believe that everyone deserves to look and feel their best, 
              and our mission is to provide exceptional nail services in a welcoming, comfortable environment.
            </p>
            <p className="leading-relaxed text-lux-espressoLight">
              Our salon is more than just a place to get your nails done—it's a space where you can relax, 
              unwind, and leave feeling refreshed and confident. We take pride in our attention to detail, 
              commitment to hygiene, and dedication to staying current with the latest nail trends and techniques.
            </p>
          </section>

          {/* Why Choose Us Section */}
          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Why Choose Perfect Nails?</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-display text-xl font-medium text-champagne-800">Expert Technicians</h3>
                <p className="text-lux-espressoLight">
                  Our team consists of highly trained and experienced nail technicians who are skilled in 
                  the latest techniques and trends in nail care and design.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-xl font-medium text-champagne-800">Premium Products</h3>
                <p className="text-lux-espressoLight">
                  We use only the highest quality products and tools to ensure your nails look beautiful 
                  and last as long as possible.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-xl font-medium text-champagne-800">Relaxing Environment</h3>
                <p className="text-lux-espressoLight">
                  Our salon provides a clean, comfortable, and relaxing atmosphere where you can unwind 
                  and enjoy your nail care experience.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-display text-xl font-medium text-champagne-800">Convenient Location</h3>
                <p className="text-lux-espressoLight">
                  Located at <strong className="text-lux-espresso">4030 E Bell Rd #110, Phoenix, AZ 85032</strong>, we're easily accessible 
                  and offer convenient parking for our clients.
                </p>
              </div>
            </div>
          </section>

          {/* Services Overview */}
          <section className="mb-8 rounded-xl border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Our Services</h2>
            <p className="mb-4 leading-relaxed text-lux-espressoLight">
              At <strong className="text-lux-espresso">Perfect Nails</strong>, we offer a comprehensive range of professional nail care services:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-2 text-lux-espressoLight">
              <li><strong>Manicures</strong> - Classic and gel manicures to keep your hands looking beautiful</li>
              <li><strong>Pedicures</strong> - Relaxing foot care treatments for healthy, beautiful feet</li>
              <li><strong>Gel X</strong> - Long-lasting gel extensions for natural-looking length</li>
              <li><strong>Gel Builder</strong> - Strong, durable gel overlays for nail strengthening</li>
              <li><strong>Acrylic Nails</strong> - Classic acrylic extensions and overlays</li>
              <li><strong>Nail Art</strong> - Custom designs and creative nail art to express your style</li>
            </ul>
            <Link
              href="/services"
              className="inline-block rounded-xl bg-champagne-600 px-6 py-3 font-semibold text-white transition hover:bg-champagne-700"
            >
              View All Services →
            </Link>
          </section>

          {/* CTA Section */}
          <section className="rounded-xl border border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-lux-cream/60 to-champagne-100/80 p-8 text-center shadow-md ring-1 ring-champagne-200/40">
            <h2 className="mb-4 font-display text-2xl font-medium text-lux-espresso">Ready to Experience Perfect Nails?</h2>
            <p className="mb-6 text-lux-espressoLight">
              Book your appointment today and discover why we're <strong className="text-lux-espresso">Phoenix's premier nail salon</strong>.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/booking"
                className="rounded-xl bg-champagne-600 px-8 py-3 font-semibold text-white shadow-md transition hover:bg-champagne-700"
              >
                Book Appointment
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border-2 border-champagne-600 bg-white px-8 py-3 font-semibold text-champagne-700 shadow-md transition hover:bg-champagne-50"
              >
                Contact Us
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
