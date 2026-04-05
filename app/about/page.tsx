'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeroRule from '../components/PageHeroRule';
import Link from 'next/link';
import { fetchCmsSite } from '../lib/cmsSiteClient';

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
      url: 'https://perfectnails.com/about',
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
        url: 'https://perfectnails.com',
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
      {/* Hero Section */}
      <section className="relative border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-stone-100 to-champagne-100 py-3 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-champagne-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-champagne-200/50 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'About' }]} />
          <div className="text-center mb-1 mt-0.5">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">
              {aboutContent.title || 'About Us'}
            </h1>
            <PageHeroRule />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10 border-t border-champagne-300/25">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <article className="mb-8 rounded-lg border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            {aboutContent.content ? (
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {aboutContent.content}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Perfect Nails</h2>
                <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                  Located in <strong>Phoenix, Arizona</strong>, <strong>Perfect Nails</strong> is your premier destination for 
                  professional nail care services. We combine artistry, quality products, and exceptional 
                  customer service to create the perfect nail experience.
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Our team of <strong>skilled nail technicians</strong> is dedicated to providing you with the highest quality 
                  nail care services in a relaxing and friendly environment. Whether you're looking for a classic 
                  manicure, a relaxing pedicure, or stunning nail art, our expert professionals are here to make 
                  your vision a reality.
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  At <strong>Perfect Nails</strong>, we understand that your nails are a reflection of your personal style. That's why 
                  we offer a comprehensive range of services including <strong>manicures, pedicures, Gel X, Gel Builder, 
                  Acrylic nails</strong>, and custom nail art designs. We use only the finest products and latest techniques 
                  to ensure lasting results.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Visit our <Link href="/services" className="text-champagne-600 hover:text-champagne-700 font-semibold">services page</Link> to 
                  explore our offerings, or <Link href="/booking" className="text-champagne-600 hover:text-champagne-700 font-semibold">book an appointment</Link> today 
                  to experience the <strong>Perfect Nails</strong> difference.
                </p>
              </>
            )}
          </article>

          {/* Our Story Section */}
          <section className="mb-8 rounded-lg border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              <strong>Perfect Nails</strong> was founded with a passion for bringing beautiful, professional nail care to the 
              <strong>Phoenix, Arizona</strong> community. We believe that everyone deserves to look and feel their best, 
              and our mission is to provide exceptional nail services in a welcoming, comfortable environment.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our salon is more than just a place to get your nails done—it's a space where you can relax, 
              unwind, and leave feeling refreshed and confident. We take pride in our attention to detail, 
              commitment to hygiene, and dedication to staying current with the latest nail trends and techniques.
            </p>
          </section>

          {/* Why Choose Us Section */}
          <section className="mb-8 rounded-lg border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Perfect Nails?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-champagne-600 mb-2">Expert Technicians</h3>
                <p className="text-gray-700">
                  Our team consists of highly trained and experienced nail technicians who are skilled in 
                  the latest techniques and trends in nail care and design.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-champagne-600 mb-2">Premium Products</h3>
                <p className="text-gray-700">
                  We use only the highest quality products and tools to ensure your nails look beautiful 
                  and last as long as possible.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-champagne-600 mb-2">Relaxing Environment</h3>
                <p className="text-gray-700">
                  Our salon provides a clean, comfortable, and relaxing atmosphere where you can unwind 
                  and enjoy your nail care experience.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-champagne-600 mb-2">Convenient Location</h3>
                <p className="text-gray-700">
                  Located at <strong>4030 E Bell Rd #110, Phoenix, AZ 85032</strong>, we're easily accessible 
                  and offer convenient parking for our clients.
                </p>
              </div>
            </div>
          </section>

          {/* Services Overview */}
          <section className="mb-8 rounded-lg border border-champagne-300/45 bg-white p-8 shadow-md ring-1 ring-champagne-100/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              At <strong>Perfect Nails</strong>, we offer a comprehensive range of professional nail care services:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Manicures</strong> - Classic and gel manicures to keep your hands looking beautiful</li>
              <li><strong>Pedicures</strong> - Relaxing foot care treatments for healthy, beautiful feet</li>
              <li><strong>Gel X</strong> - Long-lasting gel extensions for natural-looking length</li>
              <li><strong>Gel Builder</strong> - Strong, durable gel overlays for nail strengthening</li>
              <li><strong>Acrylic Nails</strong> - Classic acrylic extensions and overlays</li>
              <li><strong>Nail Art</strong> - Custom designs and creative nail art to express your style</li>
            </ul>
            <Link 
              href="/services" 
              className="inline-block px-6 py-3 bg-champagne-600 text-white rounded-lg font-semibold hover:bg-champagne-700 transition"
            >
              View All Services →
            </Link>
          </section>

          {/* CTA Section */}
          <section className="rounded-lg border border-champagne-400/35 bg-gradient-to-br from-champagne-50 to-stone-100 p-8 text-center shadow-md ring-1 ring-champagne-200/40">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Experience Perfect Nails?</h2>
            <p className="text-gray-700 mb-6">
              Book your appointment today and discover why we're <strong>Phoenix's premier nail salon</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="px-8 py-3 bg-champagne-600 text-white rounded-lg font-semibold hover:bg-champagne-700 transition shadow-lg"
              >
                Book Appointment
              </Link>
              <Link
                href="/contact"
                className="px-8 py-3 bg-white text-champagne-600 rounded-lg font-semibold hover:bg-champagne-50 transition shadow-lg border-2 border-champagne-600"
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
