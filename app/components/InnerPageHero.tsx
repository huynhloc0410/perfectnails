import type { ReactNode } from 'react';
import Breadcrumbs from './Breadcrumbs';
import PageHeroRule from './PageHeroRule';

export default function InnerPageHero({
  breadcrumbLabel,
  title,
  subtitle,
}: {
  breadcrumbLabel: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-lux-cream/85 to-champagne-100 py-[0.525rem]">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-champagne-300 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-champagne-200/50 blur-3xl" />
      </div>
      <div className="relative z-10 container mx-auto px-6">
        <Breadcrumbs items={[{ label: breadcrumbLabel }]} />
        <div className="mb-[0.175rem] mt-[0.175rem] text-center">
          <h1 className="mb-0.5 font-display text-xl font-semibold tracking-tight text-lux-espresso md:text-2xl">
            {title}
          </h1>
          <PageHeroRule />
          {subtitle ? (
            <p className="mx-auto mt-[0.525rem] max-w-2xl text-sm font-light leading-relaxed text-lux-espressoLight/95">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
