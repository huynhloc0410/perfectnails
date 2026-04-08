'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="container mx-auto max-w-full px-4 py-[0.525rem] sm:px-6 sm:py-[0.7rem]" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-lux-espressoLight/90">
        <li>
          <Link href="/" className="transition hover:text-champagne-700">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 items-center">
            <span className="mx-1 text-lux-line/80 sm:mx-2" aria-hidden>
              /
            </span>
            {item.href ? (
              <Link href={item.href} className="transition hover:text-champagne-700">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-lux-espresso" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

