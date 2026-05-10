import type { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export type ServiceSlug = 'pedicure' | 'manicure' | 'builder-gel' | 'acrylic';

export interface ServiceLandingCopy {
  slug: ServiceSlug;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  breadcrumbLabel: string;
  subtitle: string;
  intro: string;
  bullets: readonly string[];
  closing: string;
}

export const SERVICE_LANDING_PAGES: Record<ServiceSlug, ServiceLandingCopy> = {
  pedicure: {
    slug: 'pedicure',
    metaTitle: `Pedicures in Phoenix, AZ | ${SITE_BRAND_NAME}`,
    metaDescription:
      'Relaxing pedicures near Bell Rd, Phoenix — soak, shaping, cuticle care, callus attention, massage & polish or gel finish. Book your pedicure at Perfect Nails & Spa.',
    heroTitle: 'Pedicures',
    breadcrumbLabel: 'Pedicure',
    subtitle: 'Foot care and polish with calm, meticulous attention — ideal before events or whenever you want soft, refreshed feet.',
    intro:
      'Whether you prefer a classic polish finish or long-wearing gel, our pedicure services focus on thorough prep, gentle exfoliation where needed, and a polished result that photographs beautifully.',
    bullets: [
      'Cuticle work and nail shaping tailored to your preference',
      'Callus care and hydration focused on comfort',
      'Polish or gel finish options — ask what fits your lifestyle',
      'Easy online booking with your preferred time window',
    ],
    closing:
      'Ready to book? Reserve your pedicure online or call us — walk-ins are welcome when we have availability.',
  },
  manicure: {
    slug: 'manicure',
    metaTitle: `Manicures in Phoenix, AZ | ${SITE_BRAND_NAME}`,
    metaDescription:
      'Professional manicures in Phoenix near Bell Rd — shaping, cuticle care, gel polish options, and neat finishes for everyday wear or special occasions.',
    heroTitle: 'Manicures',
    breadcrumbLabel: 'Manicure',
    subtitle: 'Clean shaping, refined cuticle care, and finishes designed to stay elegant in real life — not just in photos.',
    intro:
      'From natural nail grooming to gel polish, we focus on symmetry, strength, and a comfortable chair-side experience. Tell us your lifestyle and we’ll recommend a finish that fits.',
    bullets: [
      'Precise shaping and cuticle detailing',
      'Gel polish options where you want longer wear',
      'Aftercare guidance to help your manicure last',
      'Pair with nail art on our services menu when you want extra flair',
    ],
    closing:
      'Book a manicure online in minutes, or stop by when you’re in the neighborhood.',
  },
  'builder-gel': {
    slug: 'builder-gel',
    metaTitle: `Builder Gel Nails in Phoenix, AZ | ${SITE_BRAND_NAME}`,
    metaDescription:
      'Builder gel overlays and enhancements in Phoenix — added strength, structured shape, and durable finishes. Schedule builder gel at Perfect Nails & Spa on E Bell Rd.',
    heroTitle: 'Builder Gel',
    breadcrumbLabel: 'Builder Gel',
    subtitle: 'Structured strength with gel systems — a popular choice when you want resilience without the bulk of traditional acrylic.',
    intro:
      'Builder gel can help reinforce natural nails or support extensions with a flexible feel. We tailor thickness and shape to your goals, keeping the profile balanced and wearable.',
    bullets: [
      'Ideal when nails need extra strength or gentle correction',
      'Shaping options from soft squares to refined almonds',
      'Maintenance visits keep structure balanced as your nails grow',
      'Combine with gel color or nail art from our menu',
    ],
    closing:
      'Not sure if builder gel is right for you? Book a consultation alongside your appointment notes and we’ll guide you.',
  },
  acrylic: {
    slug: 'acrylic',
    metaTitle: `Acrylic Nails in Phoenix, AZ | ${SITE_BRAND_NAME}`,
    metaDescription:
      'Acrylic nail enhancements in Phoenix, AZ — length, shape, and durable overlays from experienced technicians. Book acrylic nails at Perfect Nails & Spa.',
    heroTitle: 'Acrylic',
    breadcrumbLabel: 'Acrylic',
    subtitle: 'Classic acrylic enhancements for length, strength, and customizable shapes — sculpted with attention to balance and salon-safe prep.',
    intro:
      'Acrylic remains a dependable choice for guests who want structured extensions or maximum durability. We prioritize proper prep, hygiene, and finishes that suit your day-to-day.',
    bullets: [
      'Length and shape tailored to your preference',
      'Repairs and maintenance scheduling available',
      'Finish options include polish, gel color, or nail art add-ons',
      'Ideal when you want maximum structure for active routines',
    ],
    closing:
      'Book acrylic services online and add details in your appointment notes so we can allocate the right time.',
  },
};

export function serviceLandingMetadata(slug: ServiceSlug): Metadata {
  const p = SERVICE_LANDING_PAGES[slug];
  const path = `/${slug}`;
  const ogUrl = siteAbsoluteUrl(path);
  return {
    title: {
      absolute: p.metaTitle,
    },
    description: p.metaDescription,
    keywords: [
      `${p.heroTitle.toLowerCase()} Phoenix`,
      `nail salon Phoenix AZ`,
      `${SITE_BRAND_NAME}`,
      'Bell Rd nail salon',
    ],
    openGraph: {
      title: p.metaTitle,
      description: p.metaDescription,
      type: 'website',
      locale: 'en_US',
      url: ogUrl,
      siteName: SITE_BRAND_NAME,
      images: [
        {
          url: siteAbsoluteUrl('/og-image.jpg'),
          width: 1200,
          height: 630,
          alt: `${p.heroTitle} — ${SITE_BRAND_NAME}, Phoenix AZ`,
        },
      ],
    },
    alternates: {
      canonical: path,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
